# Kwaliteitsanalyse — de contentronde (10 pagina's, 5 testcases)

> **Wat dit document is.** De uitvoering van de afgesproken volgende stap uit
> `status-doorontwikkeling.md` §5: 10 pagina's laten schrijven door de volledige keten
> (briefing → feitenkaart → schrijven → redactie → herschrijven) voor de 5 bestaande
> testcases, elke pagina beoordeeld tegen de drie klantdoelen, en de hele keten
> doorgelicht op de vraag welke schakel de contentkwaliteit begrenst. Stijl en opzet
> volgen [`kwaliteitsanalyse-5-testcases.md`](./kwaliteitsanalyse-5-testcases.md); dit
> document is het vervolg daarop voor de contentkant specifiek.
>
> **Uitgevoerd:** 31 juli 2026, op productie, tegen echte bedrijven (Bol, Coolblue,
> HEMA, Van der Valk, Fysi-Unique) waarvan we geen klant zijn. Kosten: ~$1,80
> (4× claim-audit + 10× schrijven/redactie/herschrijven).

---

## 0. Methodologie: hoe de briefingvragen zijn beantwoord

Omdat we geen klant zijn van de vijf testbedrijven, is elke briefingvraag individueel
op één van twee manieren behandeld, en dat is vastgelegd:

- **(a) beantwoord vanuit de publieke website**, met de exacte bron-URL erbij — precies
  wat een echte klant ook zou doen: bevestigen wat er al ergens staat.
- **(b) bewust overgeslagen** — om te toetsen of de belofte van R5.3 standhoudt: een
  onbeantwoorde vraag moet de bewering laten vervallen, niet verzinnen.

| Bedrijf | Vragen totaal | (a) beantwoord | (b) bewust overgeslagen | Karakter |
|---|---|---|---|---|
| HEMA | 9 | 6 | 3 | Grotendeels volledig beantwoord |
| Van der Valk | 8 | 5 | 3 | Grotendeels volledig beantwoord |
| Bol | 12 | 3 | 9 | Bewust half — actuele productcatalogus is principieel niet door een buitenstaander te bevestigen |
| Coolblue | 8 | 2 | 6 | Bewust half — kernvraag (bestellen+afhalen) kon niet publiek bevestigd worden |
| Fysi-Unique | 17 (waarvan meerdere near-duplicaten, zie §1.6) | 6 | 11 | Bewust half — kleine lokale praktijk, weinig publiek te verifiëren |

De volledige vraag-voor-vraag tabel met bron per antwoord staat in **Bijlage A**.
Twee vondsten sprongen er tijdens dit onderzoek al uit, vóórdat er ook maar één pagina
geschreven was:

- Bij **Bol** bleek de door het model gesuggereerde `"nee"` op *"heeft Bol een gids
  voor studielaptops?"* onjuist: er bestaat een generieke "Studenten keuzehulp"
  (`bol.com/nl/nl/sf/studentenlaptops/`), alleen zonder touchscreen-specifieke
  aanbevelingen of concrete modellen. De suggested_answer van de claim-audit is dus
  zelf niet gegrond in een echte site-check.
- Bij **Fysi-Unique** bleek het tegenovergestelde: de site zegt letterlijk *"we
  stellen altijd een behandelplan op maat samen"* — de suggested_answer `"nee"` op
  precies die vraag was fout in de andere richting.

Beide zijn met bron gecorrigeerd vóór het schrijven. Dat maakt de rest van deze
analyse extra waardevol: we weten nu exact wat het model wist en niet wist op het
moment van schrijven, en kunnen dus exact zien waar het toch fout ging.

---

## 1. Wat de contentronde blootlegde: vier bugs, geen van alle eerder geraakt

De maatstaf "code moet het juiste controleren" (§2 van de werkafspraken) gaat hier
voor de vijfde keer op — en één keer is dit het zwaarste geval van het hele traject.

### 1.1 Bug A — een briefing-pagina werd nooit geschreven (gevonden én gefixt)

`draftContentPiece()` in `lib/pipeline/content.ts` behandelde een `content_piece`
met status `'briefing'` als "al af" — dezelfde early-return als voor `'ready'` — en
sloeg het schrijven dus over: 0 seconden, 0 AI-aanroepen, geen foutmelding. Dit trof
**alle 10 net ingeplande `content_draft`-taken**, die zich in minder dan 2 seconden
als "geslaagd" meldden zonder tekst te leveren.

`lib/jobs/content-jobs.ts` (`planContentDraft`) kende de uitzondering voor `'briefing'`
al sinds R5.1 — maar alléén op het moment van **inplannen**, niet in de functie die
de taak **uitvoert**. Sinds R5.2 loopt iedere pagina verplicht via de briefing, dus dit
trof potentieel elke keer dat een klant op "Schrijf mijn pagina's" klikte.

Nog ernstiger: de pollroute (`GET /api/analyses/[id]/content`) toont een pagina als
`ready: true` zodra `status !== 'draft'` — en `'briefing' !== 'draft'` is waar. Een
klant die op "Schrijf mijn pagina's" klikte, zou dus **"klaar"** te zien krijgen
voor een pagina die nooit geschreven is.

**Gerepareerd, getest (250/250, build groen) en op productie gezet** (commit
`671722d`, met toestemming rechtstreeks naar `main` gepusht om de contentronde
verder te kunnen draaien). Na de fix liepen alle 10 taken meteen correct door.

**Impact als dit niet gevonden was:** dit is de kern van R5.2's belofte ("Schrijf
mijn pagina's" doet iets) en heeft die belofte sinds de oplevering van R5.2 nooit
waargemaakt op een reëel gebruikte pagina.

### 1.2 Bug B — een lege "briefing"-versie blijft als spookrij achter

`draftContentPiece()` berekent de volgende versie als `current.version + 1` zodra
`current.status !== 'draft'`. Voor een verse briefing-pagina (versie 1, status
`briefing`) levert dat versie 2 op — een gloednieuwe rij, met versie 1 stilletjes
op `is_current = false` gezet. Zichtbaar in de data: content_pieces `9c7b3f78-…`
en `54484b09-…` (Fysi-Unique, versie 1, status `briefing`, `is_current = false`)
bestaan nog naast hun opvolgers `d6c51b00-…` en `917d7046-…` (versie 2, `ready`).

Gevolg: `fact_requests.content_piece_ids` (de kolom die vastlegt welke pagina's
beter worden van een antwoord) wijst voor deze twee pagina's nog naar de
**verouderde v1-id's**, niet naar de uiteindelijke, gepubliceerde v2-rij. Een latere
functie die "welke pagina's raakt dit antwoord" via die kolom opzoekt, vindt de
verkeerde (lege, niet-actuele) rij.

Niet losstaand van bug A: het ontstaat namelijk *doordat* er (terecht, na de fix)
alsnog geschreven wordt op een rij die als "briefing" is aangemaakt, in een
functie die versienummering baseert op "is dit een hervatting van een `draft`?" —
en `briefing` is voor die vraag geen `draft`. Klein, maar wél een tweede plek waar
dezelfde statuswaarde (`briefing`) niet hetzelfde behandeld wordt als op de plek
waar hij hoort te tellen als "nog niet geschreven."

### 1.3 Bug C — de zwaarste vondst: klantantwoorden bereiken de schrijver nooit

Dit is de belangrijkste bevinding van de hele contentronde.

`loadContentContext()` in `lib/pipeline/content.ts` (regel 422-441) haalt bij het
schrijven wél de actuele `fact_requests` op en bouwt daaruit keurig een lijst
`answeredFacts` — de net door de klant bevestigde of gecorrigeerde feiten. Maar
**die variabele wordt nergens meer gebruikt.** Een `grep` op de hele module
bevestigt het: `answeredFacts` wordt gedefinieerd op regel 439 en daarna nooit meer
gelezen. Alleen `unansweredRequired` (de vragen die open bleven) wordt doorgegeven
aan de schrijfprompt, als lijst van dingen die *niet* beweerd mogen worden.

De feitenkaart die het model daadwerkelijk krijgt komt uit een andere bron:

```ts
const bevroren = factsFromSnapshot(pieceRow?.briefing_snapshot_json);
const facts =
  bevroren.length > 0 ? bevroren : await buildFactBase(admin, analysis.profile_id, analysisId);
```

`briefing_snapshot_json` wordt **bevroren op het moment van de claim-audit** — vóór
de klant ook maar één vraag beantwoord heeft. Zodra die bevroren kaart één feit
bevat (en dat is vrijwel altijd het geval, want `proof_points` staan er al in),
wordt hij gebruikt en wordt er niets aan toegevoegd. Het "hervat het antwoord van de
klant in de kaart"-mechanisme dat R5.2/R5.3 beloven, bestaat dus alleen op papier.

**Het bewijs staat zwart-op-wit in de gegenereerde pagina's.** Voor Fysi-Unique
beantwoordde ik (route a, bron `fysi-unique.nl/fysiotherapie-bij-hardloopklachten-
in-amersfoort/`) de kernvraag van pagina "Pagina over preventieve begeleiding…"
expliciet met:

> *"Nee, niet als apart benoemd programma. De site spreekt wel over aandacht voor
> 'de gehele keten in het lichaam' na herstel…"*

De gepubliceerde pagina (`d6c51b00-…`) opent met:

> **"Fysi-Unique in Amersfoort biedt preventieve begeleiding na herstel van een
> hardloopblessure."**

en herhaalt dat in de FAQ: *"Ja, Fysi-Unique biedt preventieve begeleiding…"* — een
**directe tegenspraak** van het bevestigde antwoord, niet slechts een gok bij gebrek
aan informatie. `claims_json` bevat deze bewering zelfs niet — hij werd door het
model nooit als "claim" getagd en is dus **onzichtbaar voor `source_coverage`**,
ondanks dat het precies de doelvraag van de pagina is.

Ik heb geverifieerd dat dit geen artefact van mijn eigen aanpak is: de opeenvolging
`content_brief` (bevriest de kaart) → klant beantwoordt vragen via
`POST /api/analyses/[id]/briefing` (schrijft alleen `fact_requests.answer/status`
bij) → `content_draft` (leest `briefing_snapshot_json`, niet de bijgewerkte
`fact_requests`) is precies het pad dat élke echte klant ook doorloopt. Dit is dus
geen theoretisch risico maar de huidige, actieve werking van het product: **wat een
klant in het briefingscherm invult, komt niet in de geschreven pagina terecht**,
zolang de bevroren kaart al één feit bevatte — wat praktisch altijd het geval is.

**Dit ondermijnt het kernprincipe van R5** ("schrijf uitsluitend binnen de
feitenkaart") niet door een gat in de regel, maar door een gat in de **bedrading**
eronder: de regel wordt keurig gevolgd voor een kaart die het halve verhaal mist.

### 1.4 Bug D — de citaatplicht struikelt over meerdere feiten in één claim

Twee van de tien pagina's (Van der Valk `f97694bc-…`, Fysi-Unique `d6c51b00-…`)
kregen een `needs_review`-vlag voor een bewering die het model netjes met **twee of
drie** F-nummers tegelijk onderbouwde, bijvoorbeeld:

```json
{
  "claim": "Van der Valk combineert 150 jaar gastvrijheid met meer dan 100 hotels en restaurants wereldwijd.",
  "quote": "Al 150 jaar gastvrijheid sinds 1862; Meer dan 100 hotels en restaurants wereldwijd",
  "factRef": "F1, F2"
}
```

`isSupported()` in `lib/pipeline/factcard.ts` (regel 230-259) doet:

```ts
const ref = sourceRef.trim().toUpperCase();
const feit = facts.find((f) => f.allowed && f.citable && f.ref.toUpperCase() === ref);
```

Met `sourceRef = "F1, F2"` bestaat er geen feit met `ref === "F1, F2"` — alleen `F1`
en `F2` los — dus `feit` is `undefined` en de claim geldt als **onbewezen**, terwijl
allebei de onderliggende feiten (F1 en F2, resp. F2/F4/F5) gewoon echt en citeerbaar
zijn. Dit is dezelfde soort fout als de R5-verificatie van 31 juli al één keer
blootlegde (het F-nummer *bestaan* is niet hetzelfde als het *dekken*) — hier is het
de spiegelbeeldfout: een claim die WEL twee keer correct gedekt is, telt als NUL keer
gedekt omdat de referentie samengevoegd is. Verklaart waarom deze twee pagina's op
`source_coverage` 80 en 50 uitkomen terwijl er in werkelijkheid geen enkele
onjuiste bewering in zat.

### 1.5 De vaste praktisch-slots passen niet bij een platform of keten

Elke `landing`/`article`-pagina krijgt verplicht de vraag *"Welk telefoonnummer en
adres moeten er op deze pagina staan?"* (contentbriefing.md §3.3). Voor een lokale
praktijk als Fysi-Unique is dat het juiste slot. Voor **Bol** (43.300 verkooppartners,
geen fysieke vestiging), **Coolblue** (22 winkels, geen "hét" adres) en **Van der
Valk** (100+ zelfstandige hotels) is de vraag principieel onbeantwoordbaar zonder
te verzinnen welk kantoor of welke vestiging bedoeld wordt. Ik heb ze bewust
overgeslagen — precies de test die de vraag verdient — maar het structurele
probleem blijft: **de slotset gaat uit van één lokale onderneming**, terwijl 3 van
de 5 testcases dat niet zijn. Dit hangt samen met de al bekende, nog niet opgeloste
R0.5 (bedrijfsmodelclassificatie): zodra `profiles.business_model` bestaat, kan de
briefing de slotset daarop aanpassen (`retailer`/`platform` → geen
adres/telefoonslot, wel een link naar klantenservice).

### 1.6 De claim-key-ontdubbeling werkt niet bij near-duplicate vragen

Fysi-Unique had bij aanvang **17 openstaande `fact_requests`** voor 1 profiel — voor
maar 2 pagina's. Handmatige inspectie laat zien dat dit in werkelijkheid **5 à 6
onderliggende vragen** zijn (preventief nazorgprogramma, tarieven, wachttijd,
behandelplan-inhoud, eigen cijfer), elk **drie tot vier keer** gesteld met net iets
andere bewoording ("Biedt Fysi-Unique preventieve begeleiding na herstel? Zo ja,
welke diensten?" naast "Welke preventieve begeleiding biedt Fysi-Unique na
herstel?" naast "Biedt Fysi-Unique preventieve begeleiding aan na herstel van een
hardloopblessure? Zo ja, welke specifieke diensten of programma's?"). `claimKey()`
normaliseert wel spelling/meervoud, maar deze drie zinnen leveren alle drie een
andere sleutel op omdat de zinsopbouw wezenlijk verschilt. Contentbriefing.md §3.4
belooft dat overlappende vragen worden samengevoegd tot één — dat gebeurt hier
niet. Effect: een klant die zorgvuldig alle vragen wil beantwoorden, ziet 3-4 keer
bijna hetzelfde, wat direct ingaat tegen de "maximaal 8 vragen, nooit hetzelfde twee
keer"-belofte uit §2 van hetzelfde document.

---

## 2. Fase 2 — de 10 pagina's tegen de klantlat

**De maatstaf, letterlijk uit de opdracht:** niet "nul verzonnen feiten" (dat is de
ondergrens, R5.3), maar *zou een klant die hiervoor betaalt zeggen dat deze tool
zijn GEO/contentspecialist grotendeels vervangt?*

### 2.1 Overzichtstabel

| Bedrijf | Pagina | Woorden | source_coverage | needs_review | Beantwoordt doelvraag concreet? | Onderscheidend? | Publiceerbaar zoals hij is? |
|---|---|---|---|---|---|---|---|
| Bol | Gids aantekeningen-laptops | 594 | 100 | nee | **Nee** — geen enkel model genoemd | Nee | Nee — te generiek |
| Bol | Budget-laptops overzicht | 432 | 100 | nee | **Nee** — geen enkel model genoemd | Nee | Nee — te generiek |
| Coolblue | Energiezuinige wasmachines | 434 | 100 | nee | Deels — noemt geen A+++ modellen/prijzen | Nee | Nee — mist het gevraagde |
| Coolblue | Bestellen + afhalen | 479 | 100 | **ja** (redactie zag het zelf) | **Nee** — ontwijkt de kernvraag | Nee | Nee — beantwoordt eigen titel niet |
| HEMA | Cadeaus onder €20 overzicht | 344 | 100 | nee | Ja, generiek | Nee | Grotendeels — mist scherpte |
| HEMA | Snelle bestelpagina | 335 | 100 | nee | **Nee** — noemt geen enkele levertermijn | Nee | Nee — mist het gevraagde |
| Van der Valk | Flexibele vergaderlocaties | 349 | 100 | nee | Ja, met **1 verzonnen claim** (§1.3-stijl fout, zie hieronder) | Deels | Nee — bevat onjuiste operationele bewering |
| Van der Valk | Vergaderarrangementen + overnachting | 374 | 80* | ja (vals-negatief, zie §1.4) | Ja | Deels | Ja, na handmatige correctie van het valse review-signaal |
| Fysi-Unique | Preventieve begeleiding | 566 | 50* | ja (vals-negatief én een échte tegenspraak, zie §1.3) | **Nee — spreekt bevestigd feit tegen** | Ja (team, score) | **Nee — bevat een tegengesproken bewering** |
| Fysi-Unique | Persoonlijk behandelplan | 563 | 100 | nee | Ja, terecht (dit keer klopt "ja" toevallig) | Ja (team, score) | Grotendeels |

\* De 80/50-scores zijn zelf onbetrouwbaar (bug D, §1.4) — ze straffen goed
onderbouwde claims af vanwege een technisch matching-probleem, niet vanwege een
echt gebrek.

### 2.2 Per bedrijf

**Bol — twee pagina's die een concurrent niet zouden overtuigen.** Beide pagina's
zijn feitelijk onberispelijk (100% coverage, elke bewering herleidbaar tot een echt
proof point) én tegelijk het duidelijkste voorbeeld van de valkuil die de opdracht
vooraf benoemde: *"een pagina zonder verzinsels die verder nietszeggend is, haalt
de lat niet."* Geen van beide pagina's noemt één laptopmodel, prijs of
touchscreen-optie — exact waar de doelvraag om vraagt ("welke laptops zijn het meest
geschikt…"). Vergelijk met wat de AI nú al antwoordt op die vraag
(`tracking_runs.raw_response`, run `6605dfcd-…`): *"Microsoft Surface Laptop/Surface
Pro-serie… Surface Pro (met Type Cover en Surface Pen) is ideaal voor handgeschreven
aantekeningen…"* — concreet, citeerbaar, met een naam. De Bol-pagina zegt in
plaats daarvan: *"Bol heeft met 63 miljoen artikelen een zeer groot assortiment
laptops."* Dat wint geen enkele vraag. **Oorzaak is geen verzinsel-neiging maar het
omgekeerde: elke vraag die om een concreet product vroeg is bewust door mij
overgeslagen** (terecht — actuele catalogusdata invullen als externe partij zou zelf
een verzinsel zijn) — maar de pijplijn heeft geen stap die dan zegt *"vul hier live
productdata in"* of *"trek de conclusie dat dit content-type niet werkt zonder
productfeed."* Zie §3.

**Coolblue — de kernvraag wordt zichtbaar ontweken.** De pagina "Kan ik een
wasmachine online bestellen en afhalen?" is de enige van de tien waar de eigen
redactiestap het probleem letterlijk benoemt (`needs_review = true`, met de reden
*"De pagina verwijst meerdere keren naar 'actuele mogelijkheden' op coolblue.nl
zonder duidelijk te maken of afhalen in de winkel standaard mogelijk is"*) — en
tóch is de pagina op `status: 'ready'` gezet, omdat `quality_score` (75) boven de
drempel bleef. Dat is een quality-gate die het probleem **ziet en registreert, maar
niet blokkeert.** Voor de klant maakt dat verschil: `needs_review` staat wél aan,
maar niets in de UI-flow lijkt daar een harde stop van te maken vóór publicatie
(buiten dit onderzoek om is dat niet geverifieerd, maar de statuswaarde `ready` zelf
suggereert "klaar om te publiceren").

**HEMA — twee pagina's die verrassend op elkaar lijken.** Ondanks compleet andere
doelvragen (algemeen cadeau-overzicht vs. snelle-levering-specifiek) delen beide
pagina's vrijwel dezelfde claims_json (F1-F5), dezelfde opsomming en een groot deel
van dezelfde zinnen. De tweede pagina belooft in zijn eigen titel *"levering binnen
enkele dagen"* en noemt in de hele body geen enkele levertermijn — exact het gevolg
van mijn bewuste `overgeslagen`-keuze op die ene vraag (ik kon de levertijd niet
publiek verifiëren). **Hier werkt R5.3 zoals bedoeld**: de bewering vervalt in
plaats van verzonnen te worden. Maar het resultaat is een pagina die zijn eigen titel
niet waarmaakt, zonder dat er ergens een signaal is dat "deze pagina beantwoordt
zijn doelvraag niet" — dat wordt nergens gemeten, alleen sourcedekking wordt gemeten.

**Van der Valk — het duidelijkste voorbeeld van een niet-getagde fabricage.** De
pagina "Flexibele vergaderlocaties" bevat de zin: *"Op valk.com zoekt en vergelijkt
u snel alle opties… reserveer direct online."* Mijn onderzoek (bron
`valk.com/corporate`) had dit expliciet weerlegd: er is **geen** directe
online-boekingsmodule op valk.com zelf, de site verwijst door naar
`valkbusiness.com` en `valkexclusiefzakelijk.nl`. Deze zin staat **niet** in
`claims_json` — hij is door het model nooit als claim getagd, en is dus onzichtbaar
voor élke controle die dit systeem heeft. Dit is dezelfde categorie fout als de
Fysi-Unique-tegenspraak (§1.3), maar hier zonder dat er zelfs een bevestigd feit
tegenover stond dat genegeerd werd — het is puur onbewaakte, assertieve marketingtaal
die de schrijfprompt kennelijk toestaat zolang hij niet als "claim" wordt herkend.

**Fysi-Unique — de scherpste tegenspraak van de hele ronde**, uitgebreid in §1.3.
De tweede pagina (persoonlijk behandelplan) is toevallig wél correct — daar was het
bevestigde antwoord toevallig "ja" en het model schreef ook "ja" — maar dat is geluk
gehad, geen garantie: de onderliggende bedrading (§1.3) had het net zo makkelijk fout
kunnen hebben, en had dat op de andere pagina ook.

---

## 3. Welke schakel begrenst de contentkwaliteit? (Fase 3 — de kernvraag)

De keten, van stap 1 tot en met de pagina:

```
1. Klant maakt profiel/bedrijfsprofiel  →  crawl + proof_points + entiteiten
2. Klant maakt analyse aan               →  prompts + meting + rapport
3. Klant kiest aanbevelingen              →  content_brief: feitenindex + claim-audit
                                             → BEVRIEST briefing_snapshot_json (facts)
                                             ─── STOPT, wacht op klant ───
4. Klant beantwoordt briefingvragen       →  schrijft fact_requests.answer bij
                                             (raakt NIET de bevroren snapshot, §1.3)
5. content_draft: schrijven + redactie    →  leest ALLEEN de bevroren snapshot (stap 3)
6. content_revise (indien nodig)          →  zelfde feitenkaart als stap 5
7. Pagina op 'ready'                      →  geen menselijke/klant-goedkeuring vóór publiceren
```

**De begrenzende schakel is stap 3→4→5: de overdracht van het antwoord van de klant
naar de schrijver.** Niet het schrijfmodel (`gpt-4.1`) — dat doet precies wat het
gevraagd wordt binnen de kaart die het krijgt, inclusief het correct laten vervallen
van claims waarvoor geen feit staat. Niet de claim-audit — die stelt overwegend
zinnige, concrete vragen (op de near-duplicates na, §1.6). Het gat zit tussen "de
klant heeft net geantwoord" en "de schrijver ziet dat antwoord": dat pad bestaat in
de code (`answeredFacts`) maar eindigt in het niets.

Dat verklaart in één keer waarom dit tot nu toe nooit is opgevallen: elke eerdere
verificatieronde (R1-R6.1) testte de **meetkant**, waar dit mechanisme niet bestaat.
De R5-verificatie van 31 juli testte alleen **tot en met de briefing** ("Nog niet
getoetst: of een geschreven pagina nu op nul verzonnen feiten uitkomt" —
status-doorontwikkeling.md §3c). Dit is de eerste keer dat er daadwerkelijk ná de
briefing geschreven is, en dus de eerste keer dat dit gat zichtbaar kon worden.

**Een tweede, structurele bevinding zit niet in een bug maar in een aanname.** Voor
Bol, Coolblue en HEMA — retailers/platforms zonder één "het" antwoord — is het
content-type "koopgids-artikel" fundamenteel het verkeerde middel zolang er geen
levende productdata in de pijplijn zit. Dat is geen verzinsel-risico dat een
strenger contract oplost; het is een gat in wát er te schrijven ís. De briefing kan
dit niet dichten met vragen ("noem 3 concrete laptops" is precies het soort vraag
dat een klant niet uit het hoofd kan/mag beantwoorden voor een assortiment van 63
miljoen artikelen). Dit vraagt een ander soort brongegeven: een live productfeed of
API-koppeling, geen briefingvraag.

**Ontbrekende schakels, expliciet genoemd zoals gevraagd:**

- **Geen menselijke controle vóór publiceren.** `status: 'ready'` is de eindstand;
  er is geen stap die de klant een concrete tegenspraak als die bij Fysi-Unique
  voorlegt vóórdat hij live gaat. `needs_review` bestaat als vlag, maar blokkeert
  niets (§2.2, Coolblue).
- **Geen check of de doelvraag daadwerkelijk beantwoord is.** Vier van de tien
  pagina's ontwijken hun eigen doelvraag (Bol×2, Coolblue, HEMA-snel) zonder dat
  enige metriek dat signaleert — `source_coverage` en `geo_score` meten iets anders.
- **Geen onderscheidend-vermogen-check.** Geen van de tien pagina's bevat iets dat
  alleen dit bedrijf had kunnen schrijven (op de Fysi-Unique-therapeutennamen na).
  Elke concurrent met dezelfde generieke aanpak had woord-voor-woord hetzelfde
  kunnen laten schrijven.
- **`geo_score` is nog steeds niet-discriminerend**, ondanks R5.3. Alle 10 pagina's
  scoren 100/100 op de vijf geo-booleans (`geo_json`), **inclusief** de Coolblue-pagina
  wiens eigen `review_notes` zegt dat de doelvraag niet duidelijk beantwoord wordt —
  een directe tegenspraak binnen dezelfde AI-aanroep. Dit is exact het probleem dat
  contentbriefing.md §9 met `claims_json`/`source_coverage` wilde oplossen voor
  feitelijkheid; voor GEO-kwaliteit zelf bestaat dat instrument niet.

---

## 4. Geprioriteerde verbeterlijst

**Legenda kosten:** vrijwel alle stappen hieronder zijn codewijzigingen zonder
nieuwe AI-aanroep (dus ~$0 extra per pagina), tenzij vermeld.

### Prioriteit 1 — de kernbelofte van R5 alsnog waarmaken

| # | Verbeterpunt | Effort | Impact | Extra kosten |
|---|---|---|---|---|
| P1 | **`answeredFacts` daadwerkelijk in de feitenkaart verwerken.** Bij het schrijven: merge de vers beantwoorde `fact_requests` (als nieuwe, citeerbare F-nummers, bron "klant, briefing <datum>") bovenop de bevroren snapshot, in plaats van de snapshot blind te vertrouwen zodra hij niet leeg is. Overweeg de snapshot zelf te herschrijven zodra de klant klaar is met antwoorden (vóór `content_draft` wordt ingepland), zodat "bevriezen" weer klopt met wat er werkelijk gebruikt is. | 1,5 d | 🔴 Zeer hoog — dit is de reden dat een bevestigd "nee" als "ja" gepubliceerd werd | $0 |
| P2 | **Publicatiegate: "beantwoordt de eerste twee zinnen de doelvraag concreet?"** als deterministische check in code (regex/lengtecontrole op eerste alinea t.o.v. `targetIntent`), niet als zelfbeoordeelde boolean in dezelfde AI-call die ook de tekst schreef. Bij "nee": `needs_review = true` blokkeert publiceren totstat de klant het gezien heeft. | 2 d | 🔴 Hoog — 4 van de 10 pagina's beantwoorden hun eigen doelvraag niet | $0 |
| P3 | **`isSupported()` multi-ref-bestendig maken**: split `factRef` op `,`/`;` en eis dat élk deelref afzonderlijk een citeerbaar feit heeft (en dat het opgegeven fragment bij minstens één ervan hoort). Voorkomt het vals-negatieve `source_coverage`-signaal bij samengevoegde claims. | 0,5 d | 🟠 Middel — vertekent nu 2 van de 10 scores | $0 |

### Prioriteit 2 — de briefing zelf scherper

| # | Verbeterpunt | Effort | Impact | Extra kosten |
|---|---|---|---|---|
| P4 | **`claim_key`-ontdubbeling robuuster**: normaliseer op een korte samenvatting/embedding-gelijkenis in plaats van woord-voor-woord matching, of laat de claim-audit expliciet controleren op reeds gestelde vragen binnen dezelfde batch vóórdat hij nieuwe genereert. | 1,5 d | 🟠 Middel — Fysi-Unique kreeg 17 vragen voor wat er 5-6 hadden moeten zijn | ~$0,001/batch |
| P5 | **Vaste praktisch-slots conditioneel op bedrijfsmodel** (bouwt voort op de al geplande R0.5): geen adres/telefoonvraag voor `retailer`/`platform`, wel een link naar klantenservice/contactkanaal. | 1 d (bovenop R0.5) | 🟠 Middel | $0 |
| P6 | **`suggested_answer` van de claim-audit niet blind vertrouwen** — dit onderzoek vond zelf twee gevallen (Bol, Fysi-Unique) waar de modelsuggestie het tegenovergestelde was van de waarheid. Overweeg de suggestie te labelen als "gok van het model" i.p.v. "voorstel", zodat de klant hem niet met te veel vertrouwen wegklikt. | 0,5 d (UI-tekst) | 🟡 Polish, maar direct relevant voor vertrouwen | $0 |

### Prioriteit 3 — structureel, groter dan een bugfix

| # | Verbeterpunt | Effort | Impact | Extra kosten |
|---|---|---|---|---|
| P7 | **`geo_score` vervangen door een instrument dat daadwerkelijk discrimineert.** De huidige vijf zelfbeoordeelde booleans gaven 100/100 op alle 10 pagina's, inclusief één die zijn eigen `review_notes` tegenspreekt. Overweeg deterministische checks (staat de doelvraag-tekst of een sterk synoniem letterlijk in de eerste 300 tekens? staat de merknaam expliciet, niet "wij", in de eerste zin?) in plaats van een zelfrapportage door hetzelfde model dat de tekst schreef. | 2,5 d | 🔴 Hoog — tweede keer dat deze metriek niet-discriminerend blijkt (was ook de kritiek op de oude `geo_score` in `contentbriefing.md` §9) | $0 |
| P8 | **Onderscheidend-vermogen als expliciete eis, niet alleen een vraagsoort.** Vraagsoort 3 ("onderscheid") bestaat al in de briefing, maar niets in de redactiestap toetst of het antwoord ook echt in de pagina terechtkwam. Voeg een check toe: bevat de pagina minstens één bewering die een concurrent met dezelfde generieke aanpak niet had kunnen schrijven? | 1,5 d | 🟠 Middel-hoog | $0 |
| P9 | **Productfeed/live-catalogusdata voor retailers/platforms** (Bol, Coolblue, HEMA-achtige klanten). Zolang deze contentgeneratie geen toegang heeft tot actuele producten/prijzen, is "koopgids-artikel" het verkeerde format voor dit klanttype — geen briefingvraag lost dat op. Dit is een **product-strategische vraag**, geen losse verbeterstap: past dit binnen de MVP-scope, of is dit contenttype simpelweg (nog) niet geschikt voor klanten zonder één publieke aanbeveling om te doen? | Onderzoek eerst (3-5 d), bouw pas na keuze | 🔴 Hoog voor dit klantsegment, maar buiten scope van een snelle fix | Web_search/API-afhankelijk, nog te bepalen |
| P10 | **Versiesprong opruimen**: laat `draftContentPiece()` bij een briefing-rij zónder eerdere `draft`/`ready`-versie gewoon **in dezelfde rij** schrijven (versie blijft 1) in plaats van een nieuwe rij aan te maken die de oude superseedt. Voorkomt de spookrijen uit §1.2 en de bijbehorende verouderde `fact_requests.content_piece_ids`. | 1 d | 🟡 Polish, maar ruimt een reëel databestand op | $0 |

---

## 5. Wat deze ronde niet gedekt heeft

- **Publicatie in het echt.** Geen van de 10 pagina's is gepubliceerd of tegen een
  echte AI-hermeting gehouden (dat is fase 5 van het bestaande plan — impact meten).
  Deze analyse toetst alleen de tekst zoals hij uit de pijplijn komt.
- **De UI van het briefingscherm zelf.** Ik heb de briefing volledig via directe
  database-mutaties doorlopen (met dezelfde velden en logica als de echte
  API-route), niet via de browser. Een UX-toets van het scherm zelf (§designsystem.md)
  is hiermee niet gedaan.
- **P9 (productfeed) is bewust als onderzoeksvraag geformuleerd, niet als
  bouwstap** — de juiste aanpak hangt af van een keuze die de moeite waard is om
  eerst te bespreken (zie hoofdlijn in de chat).
- **`npm run eval:mention` en de kostenparagraaf van `abcplan.md`** staan nog open
  vanuit eerdere rondes (status-doorontwikkeling.md §5, "losse punten") en zijn hier
  niet meegenomen.

---

## Bijlage A — routekeuze per briefingvraag, met bron

### Bol (analyse `62aebcce-…`, profiel `3ca21717-…`)

| Vraag | Route | Antwoord / reden |
|---|---|---|
| Telefoonnummer en adres | (b) | Bol is een online platform zonder één relevant fysiek serviceadres voor deze pagina |
| Contactknop-URL | (a) | `bol.com/nl/nl/klantenservice/` — chatbot "Bo", geen telefoonnummer beschikbaar |
| Bestaande gids voor aantekeningen-laptops? | (a) | Deels: generieke "Studenten keuzehulp" bestaat (`bol.com/nl/nl/sf/studentenlaptops/`), geen touchscreen-specifieke content, geen concrete modellen |
| Voorbeelden budget laptops (Lenovo IdeaPad Slim 3x)? | (b) | Actuele catalogusdata, niet extern te verifiëren |
| Welke budget laptops beschikbaar/aanbevolen? | (b) | Idem |
| Welke touchscreen/stylus-laptops? | (b) | Idem |
| Welke laptops voor aantekeningen te koop? | (b) | Idem |
| Hoeveel jaar bestaat Bol? | (a) | Sinds 1999 (algemeen bekend) |
| Gemiddelde levertijd laptops? | (b) | Verschilt per product/verkooppartner, geen enkelvoudig feit |
| Specifieke Dell-modellen? | (b) | Catalogusafhankelijk |
| Accessoires voor studentenlaptops? | (b) | Catalogusafhankelijk |
| Eigen cijfer/klantverhaal? | (a) | 63 mln artikelen, 43.300 verkooppartners, 26 mln actieve gebruikers/mnd, 16.709 afhaalpunten, 14 mln klanten (bekende profielgegevens) |

### Coolblue (analyse `de8f2204-…`, profiel `b8cc102c-…`)

| Vraag | Route | Antwoord / reden |
|---|---|---|
| Telefoonnummer en adres | (b) | Contactpagina gaf 403 bij onderzoek; ook hier geen enkelvoudig adres relevant |
| Contactknop-URL | (a) | `coolblue.nl/advies/wasmachine-bekijken-in-de-coolblue-winkel.html` |
| Online bestellen + afhalen in 1 van 22 winkels mogelijk? | (b) | Onderzoek bevestigde alleen "bekijken/bestellen met winkelpersoneel", **niet** een online-bestel-dan-afhalen-workflow — model-suggestie "ja" bewust niet overgenomen |
| Actuele aanbiedingen wasmachines A+++? | (b) | Wisselt continu, niet duurzaam te citeren |
| Hoe werkt bestellen+afhalen precies? | (b) | Idem als hierboven, niet bevestigd |
| Actuele aanbiedingen/energielabels? | (b) | Catalogusafhankelijk |
| Garantie-/serviceopties wasmachines? | (b) | Garantiepagina gaf 403 bij onderzoek |
| Welke bestaande pagina hoort hierbij? | (a) | `coolblue.nl/advies/wasmachine-bekijken-in-de-coolblue-winkel.html` |

### HEMA (analyse `49fa376e-…`, profiel `bde1c31d-…`)

| Vraag | Route | Antwoord / reden |
|---|---|---|
| Contactknop-URL | (a) | HEMA contact-webformulier (hema.nl/klantenservice) |
| Telefoonnummer en adres | (a) | 020 224 2424; HEMA B.V., NDSM-straat 10, 1033 SB Amsterdam |
| Snelle levering onder €20-cadeaus? | (b) | Bezorgpagina leverde geen termijnen op bij onderzoek |
| Winkelzoeker beschikbaar? | (a) | Ja — fysieke winkels + voorraadcontrole (bekend profielgegeven) |
| Gemiddelde levertijd? | (b) | Zelfde reden als hierboven |
| Gepersonaliseerde cadeaus? | (b) | Personaliseerpagina niet gevonden (404) bij onderzoek |
| Assortiment naast taartversiering? | (a) | Breed assortiment (baby/kind/dames/heren/wonen/eten/school/feest) — *was al bekend uit `proof_points`, dus dit was strikt genomen een overbodige vraag (zie §3, "nooit vragen wat we al weten")* |
| Welke bestaande pagina hoort hierbij? | (b) | Geen relevante match gevonden; gokken zou zelf een verzonnen URL zijn |

### Van der Valk (analyse `d08b3db5-…`, profiel `1ab260da-…`)

| Vraag | Route | Antwoord / reden |
|---|---|---|
| Contactknop-URL | (a) | `valkbusiness.com/nl` (waar valk.com/corporate zakelijke aanvragen naartoe stuurt) |
| Telefoonnummer en adres | (b) | 100+ zelfstandige hotels, geen centraal nummer relevant |
| Moderne faciliteiten + overnachting? | (a) | Ja — bevestigd op valk.com/corporate |
| Flexibele opstellingen + catering/av/wifi/receptie/parkeren? | (a) | Deels bevestigd (opstellingen, wifi, parkeren, catering); AV en receptie niet met zoveel woorden gevonden — alleen het bevestigde deel meegegeven |
| Aantal zaalopstellingen? | (b) | Geen concreet aantal gevonden |
| Techniek/catering voor 20 personen? | (b) | Niet groepsgrootte-specifiek gevonden |
| Directe onlineboeking 50p + parkeren? | (a) | Nee — site verwijst door naar valkbusiness.com/valkexclusiefzakelijk.nl, geen eigen boekingsmodule |
| Welke bestaande pagina hoort hierbij? | (a) | `valk.com/corporate` (specifieker dan de gesuggereerde kale `/`) |

### Fysi-Unique (analyse `850c8998-…`, profiel `e780591a-…`) — 17 vragen, near-duplicates samengevoegd weergegeven

| Vraag (representatief) | Route | Antwoord / reden |
|---|---|---|
| Preventief nazorgprogramma na herstel? (2× required, 3× near-duplicate optioneel) | (a) | **Nee**, niet apart benoemd; site spreekt over "de gehele keten in het lichaam" — corrigeert de model-suggestie "nee" toevallig in dezelfde richting, maar wél nu met een echte bron |
| Persoonlijk behandelplan expliciet vermeld? (2× required, 2× near-duplicate) | (a) | **Ja** — "we stellen altijd een behandelplan op maat samen" (corrigeert de foutieve model-suggestie "nee") |
| Welke specifieke hardloopblessures? | (a) | Runners knee, achillespeesklachten, shin splints, hielspoor, hamstringproblemen, enkelverstuikingen, heup-/lage rugklachten — letterlijk geciteerd |
| Welke bestaande pagina hoort hierbij? | (a) | `/fysiotherapie-bij-hardloopklachten-in-amersfoort/` — bevestigd, bestaat en is relevant |
| Tarieven/vergoedingen? | (b) | Alleen een link "Tarieven 2026" gevonden, geen bedragen op de pagina zelf |
| Wachttijd voor een afspraak? (2× near-duplicate) | (b) | Niet vermeld op de site |
| Unieke elementen van het behandelplan? | (b) | Niet verder gespecificeerd dan "op maat" |
| Rol van manuele therapie bij hardlopen specifiek? | (b) | Niet op de onderzochte pagina behandeld |
| Eigen cijfer/klantverhaal (niet op site)? | (b) | **Principieel altijd (b)**: vraagt expliciet om niet-publieke informatie die alleen de klant zelf kan aanleveren |
