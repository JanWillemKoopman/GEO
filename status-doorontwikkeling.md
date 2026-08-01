# Status doorontwikkeling — overdracht tussen sessies

**Laatst bijgewerkt:** 1 augustus 2026 (na R8, S1 t/m S8 en R7.1) ·
**Branch:** `main` (alles is gemerged) · **Tests:** 384 eenheidstests + 24 ketentests groen

Dit document is de brug tussen werksessies. Het beschrijft **wat er af is**, **wat de afspraken
zijn die tijdens het bouwen zijn ontstaan**, en **wat er nog open staat en in welke volgorde**.
Wie hier begint hoeft de rest van de documentatie niet eerst uit te pluizen.

De inhoudelijke onderbouwing staat elders en wordt niet herhaald:

### De vier documenten van dit traject

Deze zijn op 30 en 31 juli in deze volgorde ontstaan. Samen vormen ze de ketting van
*beschrijven → beoordelen → plannen → bijhouden*; elk volgende document leunt op het vorige.

| # | Document | Ontstaan als | Wat het is |
|---|---|---|---|
| 1 | `GEO-EINDE-TOT-EINDE-PROCES.md` | het startpunt | Feitelijke beschrijving van de volledige klantreis, van account tot gemeten content, inclusief elke AI-aanroep met in- en uitvoer. **Bewust zonder meningen of aanbevelingen** — dat was de opdracht. Beschrijft de app van vóór R1; daarmee is het inmiddels óók de nulmeting waartegen de rondes af te zetten zijn. |
| 2 | `kwaliteitsanalyse-5-testcases.md` | de doorlichting | Analyse van 5 echte testanalyses (Bol, Coolblue, HEMA, Van der Valk, Fysi-Unique) tegen de drie klantdoelen. Bevat de 20 verbeterpunten V1–V20. |
| 3 | `implementatieplan.md` | **het werkdocument** | 27 stappen R0.1 t/m R6.3, met per stap bestanden, migraties en verificatiecriteria. Bevat de voortgangstabel — dát is de bron van waarheid voor wat af is. |
| 4 | `status-doorontwikkeling.md` | dit document | De brug tussen sessies: wat er af is, welke werkafspraken zijn ontstaan, wat de verificaties op productie hebben uitgewezen, en wat er in welke volgorde nog moet. |
| 5 | `kwaliteitsanalyse-contentronde.md` | de contentronde van 31 juli | 10 pagina's laten schrijven (5 testcases × 2) door de volledige keten, elke pagina beoordeeld tegen de klantdoelen, en de keten doorgelicht op de vraag welke schakel de contentkwaliteit begrenst. Bevat de zwaarste vondst van het hele traject: klantantwoorden uit de briefing bereiken de schrijver niet (§1.3 van dat document). |
| 6 | `strategie-contentkwaliteit-vervolgstappen.md` | de laag bóven R8 | Structurele ingrepen S1–S7 (plus S8 en R7.1, die er na het openen van de schrijfrechten bij kwamen): niet wat er met de feitenkaart gebeurt, maar wat erop staat; niet een strengere controle, maar een noemer die de code bepaalt. Bevat het tweede plafond dat de contentronde niet zag — de feitenkaart is merkbreed en onderwerp-blind — met de meetcijfers eronder. Vervangt de eerste versie van dat document volledig. |

Ouder, maar nog steeds leidend voor de code:

| Document | Wat het is |
|---|---|
| `optimalisatie.md`, `abcplan.md` | De oudere plannen waar de bestaande code in commentaar naar verwijst. |
| `contentbriefing.md` | De specificatie waarop R5 gebouwd is. |
| `praktijktest-udenhout.md` | De handmatige feitencheck van 28 juli waaruit de vijf verzinsels kwamen — de aanleiding voor heel R5. |

---

## 1. Waar het nu staat

### Opgeleverd (op `main`, in productie)

| Ronde | Wat het oplost |
|---|---|
| **R1** — Bewijslaag | Het rapport verzon welke concurrent een vraag won. Nu krijgt het model een deterministisch bewijsdossier uit de database aangereikt, plus een claimvalidator die achteraf elke merknaam controleert die niet in het dossier staat. |
| **R2** — Meetbaarheid | De score telde "de AI noemde niemand" mee als "jij werd niet genoemd". Nu wordt per antwoord geteld hoeveel aanbieders er genoemd worden; alleen winbare vragen tellen mee in de score, en structureel merkloze vragen worden bij vervolgperiodes overgeslagen. |
| **R3** — Zichtbaarheidsprofiel | `position` stond vol onzin (215 van 521 vermeldingen op 0) en `sentiment` gaf in 650 metingen nooit iets anders dan neutraal. Positie is gerepareerd, sentiment vervangen door `mention_role`, en citaties worden nu geteld. |
| **R4** — Concurrent-intelligence | Concurrenten werden geteld maar niet begrepen. Nieuwe pipelinestap destilleert per concurrent waaróm die genoemd wordt, met een letterlijk citaat per eigenschap. |
| **R6.1** — Gelaagd hermeten | Eén meting per vraag was te wisselvallig om een trendlijn op te tekenen. De zwaarste 8 vragen gaan nu 3× door de meting, en alle aggregatie telt per **vraag** in plaats van per meting. Geverifieerd op productie — zie §3b. |
| **R5** — Contentbriefing | Het model verzon feiten precies waar de pagina er een nodig had. Nu bouwt de app eerst een feitenkaart, laat een claim-audit bepalen welke beweringen niet onderbouwd zijn, stelt de klant maximaal 8 vragen, en schrijft daarna uitsluitend binnen die kaart — met per bewering het F-nummer dat hem dekt. |
| **R8** — Contentkwaliteit | Negen van de tien punten uit de contentronde. De zwaarste: de antwoorden die de klant in de briefing gaf bereikten de schrijver niet, waardoor een met bron bevestigd "nee" als "ja" gepubliceerd werd. Daarnaast is de GEO-beoordeling van een zelfrapportage door het schrijvende model een deterministische controle in code geworden. **Nog niet op productie geverifieerd** — zie §5. |

### Nog open

| Ronde | Stappen | Effort |
|---|---|---|
| **R8.9** — Productfeed voor retailers (onderzoeksvraag, geen bouwstap) | zie S1 hieronder | n.t.b. |
| **R0** — Fundament | R0.1 t/m R0.6 | 8 d |
| **R7** — Stabiele meetbasis (nieuw, uit §3b) | R7.1 ✅ gebouwd (migratie `0037`); de rest nog uit te werken | ~2 d resterend |
| **R6.2 / R6.3** | Inventariskwaliteitspoort, brontype als signaal | 3,5 d |

De actuele vinkjes staan in de voortgangstabel van `implementatieplan.md` §2. Dát is de bron van
waarheid; deze tabel is een samenvatting.

### Migraties

Alle migraties t/m `0032` en `0034` t/m `0037` zijn **toegepast op productie**. `0033` is
gereserveerd voor R6.2 en heeft nooit gedraaid (zie de migratietabel in `implementatieplan.md` §1).

| Nr | Ronde | Inhoud |
|---|---|---|
| `0027` | R1 | `reports.stripped_claims_json` |
| `0028` | R2 | `tracking_runs.brands_in_answer`, `prompts.brand_eliciting`, `visibility_scores.winnable_runs`/`brandless_runs` + backfill |
| `0029` | R3 | `mention_role`, `avg_position`, `citation_count`, `first_mention_count` |
| `0030` | R4 | `competitor_breakdown.attributes_json`/`why_summary` |
| `0031` | R6.1 | `tracking_runs.repeat_index` + index `tracking_runs_repeat_idx` |
| `0032` | R8.5 | `profiles.business_model` (bedrijfsmodel, nullable + check-constraint) |
| `0034` | S6 | `content_pieces.reviewed_at`/`reviewed_by` + partiële index `content_pieces_unreviewed_idx` |
| `0035` | S5 | tabel `brand_documents` (brontekst, sha256-hash, `facts_extracted`/`facts_rejected`) |
| `0036` | S8 | tabel `brand_facts` (identiteit, merkbreed/analysebreed, `superseded_by`) + unieke index op de actuele versie |
| `0037` | R7.1 | `prompts.elicit_successes`/`elicit_samples` + backfill uit `tracking_runs` |

**Wat de backfill van `0037` opleverde** (gemeten op productie, 1 augustus): 231 prompts, waarvan
201 met minstens één beoordeelde meting en 21 met drie of meer. Gemiddeld elicit-percentage 46%.
Alle 9 prompts die op `brand_eliciting = 'nee'` stonden, waren dat op **precies 2 metingen** — bij
die steekproefgrootte loopt de bovengrens van het betrouwbaarheidsinterval tot ~0,66. Dat is de
meting die R7.1 van een vlag een kans maakt.

---

## 2. Afspraken die tijdens het bouwen zijn ontstaan

Deze zijn vier rondes lang consequent toegepast. Wie verder bouwt, houdt ze aan.

**1. Een promptinstructie is een intentie, code is een garantie.**
Elke promptwijziging is gekoppeld aan een deterministisch vangnet in code. Dat is geen theorie:
in de verificatieronde bleek het model ondanks een expliciete instructie bij 10 van de 27
niet-genoemde merken tóch een rol in te vullen (structured output kiest bij twijfel de eerste
enum-waarde). Het vangnet — `mention_role: m.mentioned ? m.role : null` — ving dat af. Zelfde
patroon bij `normalizePosition()` en bij de claimvalidator onder het rapport.

**2. Rekenkunde hoort in een puur module, zonder `server-only`.**
`lib/pipeline/measure.ts` en `report.ts` importeren de Supabase-adminclient en zijn daardoor niet
te importeren vanuit `scripts/test-unit.ts`. Alles wat de uitkomst bepaalt staat daarom in een
apart, importeerbaar bestand: `period-change.ts`, `evidence-format.ts`, `validate-claims.ts`,
`position.ts`, `question-share.ts`. Nieuwe rekenregels gaan dezelfde kant op.

**3. Migraties zijn additief en idempotent.**
`add column if not exists`, nooit `drop`. Elke migratie begint met een uitgebreid commentaarblok
in het Nederlands: wat het probleem was, met welke gemeten cijfers, en waarom deze oplossing.

**4. Onbekend is een betere waarde dan een verkeerde.**
Overal waar het model iets onbruikbaars teruggeeft wordt het `null`, niet 0 en niet een gok.

**5. Commentaar legt uit wáárom, met cijfers.**
De codebase is doorspekt met Nederlandse toelichtingen die de aanleiding noemen ("bij Van der Valk
was dat 17 van de 30 vragen"). Dat is de huisstijl; nieuw commentaar volgt hem.

---

## 3. Wat de verificatieronde op productie opleverde

Op 30 juli is een volledige tweede periode gedraaid op Fysi-Unique (`850c8998-…`): 30 van de 30
vragen gemeten, 0 mislukkingen, $0,82.

**Bevestigd werkend:**
- Posities strikt 1–9 (waren 39× nul, plus waarden als 94, 174, 278, 319)
- `brand_eliciting` markeerde 9 vragen terecht als `nee`
- De concurrentprofielen uit R4.2 zijn inhoudelijk bruikbaar

**Twee bugs gevonden en gerepareerd:**
- De claimvalidator stripte twee *correcte* zinnen, omdat generieke termen (`fysiotherapie`,
  `manuele therapie`, +6 andere) in het entiteitregister met een relevante rol stonden. Opgelost
  met `looksLikeBrandName()`, op drie plaatsen toegepast.
- De `mention_role`-tegenspraak hierboven.

**Eén open bevinding, die de prioriteit veranderde** — en waar R6.1 uit voortkwam:

| | meetbare vragen | score |
|---|---|---|
| periode 0 | 17 | 18 |
| periode 1 | 11 | 36 |

Dezelfde analyse, dezelfde vragen, niets veranderd aan de site of de markt. Niet alleen de score
bewoog, ook de noemer.

---

## 3b. De R6.1-verificatie — hoe onbetrouwbaar één meting werkelijk is

Op 31 juli is periode 2 van Fysi-Unique gedraaid mét herhalingen: 21 vragen, waarvan de 8
zwaarste drie keer. 37 metingen, 0 mislukkingen, ongeveer $0,96. Dit is het cijfer waar R6.1 om
gebouwd is.

### De uitkomst

**Van de 8 herhaalde vragen veranderde bij 4 de winbaarheid tussen de metingen.** Dezelfde vraag,
dezelfde week, en de ene keer noemt de AI geen enkele aanbieder en de andere keer vier. Geen
enkele herhaalde vraag was alle drie de keren winbaar.

Het aantal genoemde aanbieders per meting, per vraag:

| Vraag (ingekort) | meting 1 | 2 | 3 |
|---|---|---|---|
| Hoe kan ik snel een afspraak maken… | 0 | 1 | 4 |
| Waar kan ik in Amersfoort terecht… | 0 | 5 | 1 |
| Welke praktijk biedt ook preventief… | 0 | 5 | 4 |
| Is een persoonlijk behandelplan mogelijk… | 0 | 4 | 0 |
| (4 overige) | 0 | 0 | 0 |

### Wat dat met de score doet

De sluitende manier om het te laten zien: neem dezelfde 21 vragen en doe alsof we elke vraag maar
één keer gemeten hadden. Afhankelijk van wélke meting je dan toevallig had:

| Als we alleen meting … hadden | winbare vragen | genoemd | score |
|---|---|---|---|
| 1 | 6 | 3 | **50** |
| 2 | 5 | 1 | **20** |
| 3 | 5 | 2 | **40** |
| *gemiddeld over alle drie (wat R6.1 nu doet)* | 5 | — | **38** |

**Dezelfde week, dezelfde vragen, en de score valt ergens tussen 20 en 50.** Dat is het antwoord
op de vraag hoe betrouwbaar de eenmalige meting al die tijd was: de trendlijn die de app tot nu
toe toonde bewoog grotendeels op ruis. De 18 → 36 uit periode 0 en 1 was geen verbetering, en de
verificatieronde is nu het bewijs in plaats van het vermoeden.

### Wat R6.1 heeft opgelost, en wat niet

**Opgelost.** De aggregatie telt aantoonbaar per vraag: 37 metingen leverden `judged_runs = 21`
op, niet 37. De herhaalde vragen wegen dus niet zwaarder. Het middelen werkt zoals bedoeld — 38
ligt netjes in het midden van 20–50 in plaats van op een van de uitersten.

**Niet opgelost — en dit is de belangrijkste openstaande bevinding.** De meetbasis krimpt hard:

| periode | judged | winbaar | score | stderr |
|---|---|---|---|---|
| 0 | 30 | 17 | 18 | 6,5 |
| 1 | 30 | 11 | 36 | 14,8 |
| 2 | 21 | 5 | 38 | 21,4 |

Bij 5 winbare vragen is de 95%-band ongeveer ±42 punten. De score is dan formeel nog een getal,
maar hij zegt niets meer. Twee dingen versterken elkaar hier:

1. **Winbaarheid is stochastisch, niet een eigenschap van de vraag.** De app behandelt hem als
   binair (`brand_eliciting` = ja/nee/onbekend), maar de meting laat zien dat het een kans is.
2. **R2.4 versmalt de basis bij elke periode.** Vragen die twee metingen lang niets opleverden
   worden overgeslagen. Dat spaart geld, maar het haalt ook vragen weg die één op de drie keer wél
   winbaar zijn.

De `score_stderr` rapporteert dit inmiddels eerlijk — dat is winst van R6.1 — maar eerlijk
rapporteren dat een cijfer onbruikbaar is, is niet hetzelfde als een bruikbaar cijfer hebben.

### Wat hieruit volgt

Dit hoort in een eigen ronde thuis, en het is nu het zwaarstwegende openstaande punt:

- `brand_eliciting` als **kans** modelleren in plaats van als vlag, en R2.4 pas laten overslaan
  bij een aantoonbaar lage kans in plaats van na twee nulmetingen.
- De **noemer stabiliseren**: óf meer vragen meten, óf de score over alle vragen berekenen met de
  winbaarheid als weging, zodat een wisselende noemer de trend niet meer domineert.
- Overwegen de score **niet te tonen** onder een minimum aantal winbare vragen — dezelfde logica
  als `measurementIsUsable`, maar dan op de winbare basis in plaats van op het aantal metingen.

Dat is geen kleine correctie op R6.1; het raakt hoe de kernmaat van het product gedefinieerd is.

---

## 3c. De R5-verificatie — een controle die het verkeerde controleerde

Op 31 juli is R5 voor het eerst end-to-end gedraaid: twee aanbevelingen van Fysi-Unique door de
contentbriefing. De taak slaagde, twee pagina's kwamen op status `briefing`, de feitenkaart telde
14 items, en het ontdubbelen over beide pagina's werkte.

**Maar de claim-audit stelde nul vragen aan de klant.** Bij een fysiotherapiepraktijk waarvan we
vrijwel geen harde feiten hebben, kan dat niet kloppen.

### De oorzaak

Van de zeven beweringen verwezen er **zes naar hetzelfde F-nummer**: een blok van 400 tekens
sitetekst dat als "feit" op de kaart stond.

| Bewering | Verwijst naar |
|---|---|
| "biedt preventieve begeleiding na herstel" | F14 — *"Wat de site over dit onderwerp zegt: …"* |
| "behandelt runnersknie, shin splints…" | F14 — idem |
| "hanteert een persoonlijke aanpak" | F14 — idem |
| "besteedt aandacht aan looptechniek" | F14 — idem |
| "biedt een persoonlijk behandelplan" | F14 — idem |
| "is een praktijk in Amersfoort met specialisatie" | F6 — sitetekst-blok |
| "heeft een 9,4 op Zorgkaart" | F1 — *echt* atomair feit |

`isSupported()` controleerde of het F-nummer **bestond**, niet of het feit de bewering ook echt
doet. Eén tekstblok dekte daarmee alles, dus gold alles als onderbouwd en verviel elke vraag.

**Dit is dezelfde fout als in R1, maar een niveau hoger.** Daar was de les: een promptinstructie is
een intentie, code is een garantie. Hier bleek dat een controle in code óók nog het juiste moet
controleren.

### De twee reparaties

**1. Niet alles wat we weten is een feit.** Een lap sitetekst of een samenvatting van het
onderzoek is *context*: bruikbaar om over te schrijven, onbruikbaar om iets mee te bewijzen. Die
items krijgen geen F-nummer meer en staan onder een kop `ACHTERGROND — GEEN BRON`. Alleen
atomaire, controleerbare uitspraken zijn nog citeerbaar: proof points en antwoorden van de klant.
Zie `FactItem.citable`.

**2. Citaatplicht.** Wie een F-nummer noemt moet de letterlijke zin uit dat feit aanwijzen die de
bewering dekt, en de code controleert of die zin er écht in staat. Hetzelfde principe als het
bewijsdossier (R1.1) en de concurrentprofielen (R4.2). Geldt voor de audit én voor de geschreven
pagina (`sourceCoverage`).

### Wat wél meteen werkte

- De vaste slots kwamen door, ontdubbeld over beide pagina's
- Het slot "welke bestaande pagina hoort hierbij?" kwam mét de juiste URL als voorstel — precies de
  verzonnen `existingUrl` uit de Udenhout-run die daarmee gerepareerd is
- `briefing_snapshot_json` werd per pagina bevroren, inclusief de aanbeveling met doelvragen

### De herhaalronde ná de reparatie — bevestigd

Dezelfde twee aanbevelingen, opnieuw door de briefing, met de citaatplicht en de
achtergrondsplitsing erin:

| | vóór de reparatie | erna |
|---|---|---|
| Vragen uit de claim-audit | **0** | **3** |
| Vaste slots | 2 | 2 |
| Waarvan verplicht (`kern`) | 0 | 2 |

De drie nieuwe vragen zijn precies de gaten die er waren:

- *"Biedt Fysi-Unique een specifiek preventief nazorgprogramma na herstel van een
  hardloopblessure?"* (verificatie, verplicht)
- *"Is het op de website expliciet vermeld dat je een persoonlijk behandelplan krijgt?"*
  (verificatie, verplicht)
- *"Welke specifieke hardloopblessures behandelt Fysi-Unique?"* (aanvulling)

Dat zijn de twee doelvragen van de gekozen pagina's, plus het detail dat de pagina concreet maakt.
Alle drie in dertig seconden te beantwoorden, alle drie over één feit.

**Nog niet getoetst:** of een geschreven pagina nu op nul verzonnen feiten uitkomt. Zie §5.

---

## 4. Testdata in productie

Vijf klantprofielen op het account van de eigenaar, aangemaakt via Supabase (niet via de UI).
Echte bedrijven, echte websites. **Er is nog geen content gegenereerd** — dat was een bewuste
keuze om kosten te beperken.

| Analyse-id | Merk | Onderwerp | Vragen | Metingen | Score/winbaar |
|---|---|---|---|---|---|
| `62aebcce-373e-48e7-a4f9-bc1a4821875d` | Bol | de beste laptop voor studenten | 29 | 29 | p0: 29 / 17 |
| `de8f2204-6505-48c0-9d89-93f96c40ceb4` | Coolblue | wasmachine kopen | 22 | 22 | p0: 67 / 12 |
| `850c8998-b143-4203-af76-243b4f9bee51` | Fysi-Unique | hardloopblessure behandelen | 30 | 60 | p0: 18 / 17 · p1: 36 / 11 |
| `49fa376e-8b23-4d2e-8c7e-669213898bef` | HEMA | verjaardagscadeau onder de 20 euro | 30 | 30 | p0: 11 / 27 |
| `d08b3db5-a64b-4645-ab4f-ae53f00bbbcd` | Van der Valk | vergaderlocatie boeken | 30 | 30 | p0: 15 / 13 |

Daarnaast staan er drie oudere Van den Udenhout-analyses (APK, Private Lease Skoda, Schadeherstel);
die dateren van vóór R2 en hebben geen `winnable_runs`. Fysi-Unique is de referentiecase — daar is
de verificatieronde op gedraaid en daar hangen de cijfers in dit document aan.

---

## 5. Wat er nog moet gebeuren, op volgorde

### ✅ De contentronde — 10 pagina's geschreven en grondig beoordeeld

**Uitgevoerd op 31 juli.** Volledige uitwerking, inclusief de vraag-voor-vraag routekeuzes
(beantwoord met bron vs. bewust overgeslagen) en de bewijsvoering per pagina, staat in
[`kwaliteitsanalyse-contentronde.md`](./kwaliteitsanalyse-contentronde.md). Samenvatting:

- **Eén bug onderweg gevonden en direct gerepareerd** (met toestemming rechtstreeks naar `main`):
  `draftContentPiece()` behandelde een `content_piece` met status `'briefing'` als "al af" en sloeg
  het schrijven stilzwijgend over. Trof potentieel elke "Schrijf mijn pagina's"-klik sinds R5.2.
  Commit `671722d`, 250/250 tests, build groen, geverifieerd op productie.
- **De zwaarste vondst van het hele traject staat er nog wél in**: de antwoorden die een klant in
  het briefingscherm geeft, bereiken de schrijver niet. `loadContentContext()` bouwt wel een lijst
  `answeredFacts` uit de actuele `fact_requests`, maar gebruikt hem nergens — de schrijver krijgt
  uitsluitend de kaart die *vóór* de antwoorden bevroren werd. Concreet bewijs: een door mij met
  bron bevestigd "nee" op de doelvraag van een Fysi-Unique-pagina werd alsnog als "ja" gepubliceerd.
  Dit is groter dan een losse bug — het is het gat waarom R5's kernbelofte ("schrijf uitsluitend
  binnen bevestigde feiten") in de praktijk niet werkt zodra de klant iets *corrigeert of aanvult*.
- Drie kleinere bevindingen (multi-ref-claims die de citaatplicht ten onrechte laten falen, een
  versiesprong die een lege spookrij achterlaat, vaste praktisch-slots die niet passen bij een
  platform/keten) en één structurele (koopgids-content is het verkeerde format voor Bol/Coolblue/
  HEMA-achtige klanten zonder productfeed) staan uitgewerkt in het document, met een geprioriteerde
  verbeterlijst (P1 t/m P10, effort/impact/kosten).

### ✅ R8 — de tien verbeterpunten uit die doorlichting gebouwd

**Opgeleverd op 31 juli**, negen van de tien (R8.9 is bewust een onderzoeksvraag gebleven, geen
bouwstap). 298 tests groen, migratie `0032` toegepast op productie. Uitwerking per stap staat in
`implementatieplan.md` §R8; de kern:

- **R8.1** — de feitenkaart krijgt de antwoorden van de klant er alsnog bij
  (`mergeAnsweredFacts`), en een nieuwer antwoord verslaat een ouder op basis van de VRAAG. Dit
  was de zwaarste vondst van de contentronde: een met bron bevestigd "nee" werd als "ja"
  gepubliceerd.
- **R8.2 / R8.7 / R8.8** — nieuwe pure module `lib/pipeline/content-gate.ts` met deterministische
  controles die de zelfrapportage van het model vervangen. Die gaf 100/100 op alle tien de
  pagina's, óók op de pagina waarvan dezelfde aanroep in z'n eigen verbeterpunten schreef dat de
  hoofdvraag niet beantwoord werd.
- **R8.3** — een bewering die op twee bevestigde feiten steunt telt niet langer als onbewezen.
- **R8.4** — bijna-identieke vragen vallen samen (`topicKey`), plus de al gestelde vragen gaan mee
  de claim-audit in.
- **R8.5** — migratie `0032` (`profiles.business_model`) en een vragenset die zich daarop aanpast.
- **R8.6** — het briefingscherm noemt `suggested_answer` nu een gok in plaats van een voorstel.
- **R8.10** — een verse briefing-rij wordt in dezelfde rij geschreven, geen spookversie meer.

**Nog te verifiëren.** Alles is met unit tests op de echte gevallen uit de contentronde getoetst,
maar er is nog geen nieuwe pagina mee geschreven op productie. Gebouwd is niet hetzelfde als
geverifieerd (§2.6): de sluitende toets is dezelfde vijf testcases opnieuw door de keten, waarbij
te controleren valt of een gecorrigeerd briefingantwoord nu écht in de tekst landt en of de poort
de vier pagina's markeert die hun doelvraag ontweken. Kosten ~$2.

### ✅ De strategische doorlichting bovenóp R8 — zeven structurele ingrepen

**Uitgevoerd op 31 juli**, na de contentronde. De vraag was niet "welke R8-punten eerst" maar
"welke schakels moeten fundamenteel anders". Volledige uitwerking, met de meetcijfers eronder en
de vier invalshoeken (AI/GEO-expert, copywriter, ontwikkelaar, klant), staat in
[`strategie-contentkwaliteit-vervolgstappen.md`](./strategie-contentkwaliteit-vervolgstappen.md).

De kern: **de contentronde vond het gat tussen klant en schrijver; deze doorlichting vond het
plafond erboven.** De feitenkaart is merkbreed en onderwerp-blind. Over vijf analyses zijn er
24 citeerbare feiten, en géén daarvan gaat over het onderwerp van de analyse — geen laptop, geen
wasmachine, geen vergaderzaal, geen hardloopblessure. Het materiaal om dat op te lossen ligt er
wél: Coolblue heeft 10 gecrawlde wasmachine-adviespagina's in `profile_pages`, waarvan er nul in
de feitenkaart terechtkwam terwijl vier Engelstalige duplicaten van de homepage dat wél deden
(`buildFactBase()` selecteert 8 pagina's zonder `order by` en zonder relevantiefilter).

Twee nieuwe codebevindingen uit die doorlichting, die in R8 thuishoren:

- **De dedupe-sleutel telt merkbrede antwoorden niet mee.** `planContentDraft()` telt beantwoorde
  vragen met `.eq("analysis_id", …)`, maar `scope = 'merk'`-vragen worden met `analysis_id = null`
  opgeslagen — 9 van de 21 beantwoorde vragen in productie (43%), inclusief beide verplichte
  `landing`-slots. Een klant die alleen merkbrede vragen beantwoordt en opnieuw op "Schrijf mijn
  pagina's" klikt, krijgt een taak die stil op de sleutel sneuvelt.
- **De bevroren feitenkaart plant zichzelf voort.** `buildDraftRow()` schrijft
  `briefing_snapshot_json` opnieuw weg op de nieuwe rij; een volgende `regenerate` leest die en
  roept `buildFactBase()` nooit meer aan. De verouderde kaart is niet één keer verkeerd maar
  permanent. R8.1 zoals beschreven dempt dit, S2 heft het op.

### ✅ S1 t/m S8 en R7.1 gebouwd, bovenop R8

**Opgeleverd op 31 juli en 1 augustus.** S1 t/m S7 zijn eerst gebouwd zónder migratie, omdat er
destijds alleen leestoegang tot productie was. Dat leverde bruikbare stappen op met drie erkende
beperkingen. Nadat de schrijfrechten er wél waren zijn die alsnog opgeheven met `0034` (vrijgave),
`0035` (merkdocumenten) en `0036` (feitenbank), plus `0037` voor R7.1. Alle vier additief en
idempotent — `add column if not exists` / `create table if not exists`, geen `drop`.

**S1 — de feitenkaart wordt onderwerpgericht en atomair.** Het plafond onder alles. Over vijf
analyses stonden er 24 citeerbare feiten op de kaart en géén ervan ging over het onderwerp; voor
"wasmachine kopen" waren dat gratis wassen tussen 12 en 15 uur, cashback op groene stroom en een
AirPods-reviewscore. `buildFactBase()` nam de eerste 8 crawlrijen — geen `order by`, geen filter —
en bij Coolblue leverde dat vier navigatiepagina's plus dezelfde vier in het Engels op, terwijl
tien wasmachine-adviespagina's (15.000 tekens) ongebruikt bleven. Nu: relevantieselectie in code
(`page-relevance.ts`) en één mini-aanroep die de letterlijke zinnen met een hard feit eruit haalt
(`fact-atomise.ts`, ~$0,004 per batch). Het vangnet staat los in `atom-verify.ts`.

**S2 — het paginaplan overleeft de briefing.** De claim-audit rekent uit wat elke pagina moet
beweren (31 beweringen over vijf batches, waarvan 19 onderbouwd) en dat werd weggegooid zodra de
vragen gesteld waren. Nu blijft het plan per pagina in `briefing_snapshot_json` staan en gaat het
als opdracht de schrijfprompt in, met per punt GEDEKT / WEERLEGD / GEEN BRON — opnieuw doorgerekend
tegen de kaart inclusief de antwoorden die R8.1 er nu bij zet.

**S3 — de code bepaalt de noemer van de dekking.** R8.7 haalde de zelfrapportage uit de GEO-score;
dit haalt hem uit `source_coverage`. Dat cijfer mat 49 door het model getagde beweringen op ~250
zinnen — één op de vijf — en juist in die andere vier vijfde zaten beide fabricages van de
contentronde. `claim-extract.ts` bepaalt nu welke zinnen een bewering zijn; een zin zonder
onderbouwde claim telt als ongedekt en komt met naam en toenaam in `review_notes`.

**S4 — de positioneringsvraag bestaat.** `onderscheid` was 0 van de 62 gestelde vragen, waardoor de
R8.8-controle op een lege verzameling draaide. Nu een deterministisch slot uit
`competitor_breakdown.attributes_json`, met één gereserveerde plek in de acht. Diezelfde
bewijszinnen gaan nu ook naar de schrijver: die kreeg alleen de woorden "prijs" en "service".

**S5 — het merkdossier.** De briefing stelt maximaal 8 vragen per batch; over vijf testklanten
leverde dat 21 beantwoorde vragen op, waarvan 8 praktisch. Nu kan de klant op het profielscherm
plakken wat hij al heeft liggen — tarieven, voorwaarden, veelgestelde vragen — en zet één
mini-aanroep dat om in vraag/antwoordparen. Het vangnet (`dossier-verify.ts`) gooit elk paar weg
waarvan het antwoord niet letterlijk in de aangeleverde tekst staat: "€ 45,00" afronden naar "45
euro" is een andere belofte dan er stond. De paren landen als beantwoorde `fact_requests` met
`scope: 'merk'`, dus `buildFactBase()` pikt ze zonder wijziging op en ze gelden meteen voor élke
analyse. `verify_after` wordt hierbij voor het eerst gevuld — die kolom bestond sinds `0024` en
deed niets. *Sinds migratie `0035` blijft het aangeleverde document zelf bewaard in
`brand_documents`, met een sha256-hash: dezelfde brochure twee keer plakken levert nu geen tweede
set feiten meer op maar een expliciete melding dat we die tekst al kennen. `facts_extracted` en
`facts_rejected` per document maken zichtbaar of de extractie-instructie streng genoeg is —
hetzelfde patroon als `stripped_claims_json` onder het rapport.*

**S6 — de publicatiepoort.** `status: 'ready'` betekende "de pijplijn is klaar" en de bibliotheek
toonde dat als "klaar om te publiceren". Nu betekent `needs_review = true` "nog niet vrijgegeven",
en de klant zet hem zelf op `false` nadat hij het vrijgavepaneel gezien heeft: de feitenkaart
waarop déze pagina gebouwd is, elke zin die iets over het bedrijf beweert mét of zonder bron, en
elke verplichte vraag die open bleef. Geen harde blokkade — de tekst blijft gewoon te kopiëren.
*Bewust géén nieuwe statuswaarde:* `content_status` is een Postgres-enum, dus `te_beoordelen` zou
een aanpassing vragen op elke plek die op status filtert. `needs_review` draagt hetzelfde
onderscheid. *Sinds migratie `0034`* leggen `reviewed_at` en `reviewed_by` vast dát er iemand keek
en wie. Zonder die twee betekende `needs_review = false` twee dingen tegelijk — "de poort vond
niets" en "een mens heeft gekeken" — en waren ze niet uit elkaar te houden. Het paneel toont nu drie
standen, en de derde is precies dat verschil: *"De controles vonden niets, maar er heeft nog niemand
naar gekeken."*

**S7 — de ketentest.** Zeven van de zeven fouten van dit traject zaten in de samenhang tussen
taken, en `test-unit.ts` kon ze daarom geen van alle vangen. `npm run test:chain` draait de échte
jobhandlers tegen een échte Postgres: dezelfde migraties `0001`…`0037`, dus dezelfde constraints,
enums en unieke indexen. Geen Docker en geen Supabase CLI nodig — `initdb` + `pg_ctl` volstaan.
Nagebootst is alleen de Supabase-wire-vertaling (`chain/supabase-shim.ts`, die gooit bij het eerste
onbekende geval in plaats van iets anders terug te geven) en OpenAI (vaste antwoorden per schema).
De vierentwintig asserties zijn de zeven bugs plus de nieuwe garanties van S1–S6 en S8.

**S8 — de feitenbank (migratie `0036`).** Een F-nummer is een POSITIE, geen identiteit: "F3"
betekent "het derde citeerbare feit in déze lijst". Dat is aantoonbaar en niet theoretisch — in de
ketentest verwees de stub naar F1 en F2, en zodra er vier klantantwoorden bijkwamen werden dat F5 en
F6, want klantantwoorden sorteren vooraan. Daardoor stond hetzelfde feit in élke snapshot van élke
versie opnieuw (bij Fysi-Unique vier therapeutenbio's), was van `claims_json` niet te zeggen naar
wélk feit een bewering verwees, belandden twee tegenstrijdige antwoorden allebei op de kaart, en was
"wat weten we over deze klant?" geen vraag die je kon stellen. Nu heeft elk feit een rij in
`brand_facts` met een `fact_key`, een scope (klantantwoorden merkbreed, geatomiseerde sitezinnen bij
deze analyse) en `superseded_by` in plaats van overschrijven — zodat een al geschreven pagina
naspeurbaar blijft. Tegenspraken komen boven in plaats van dat het model kiest. De kaart blijft
bestaan als bewijsstuk: dat is bewust "en", geen "of". Fouttolerant: gaat het schrijven stuk, dan
werkt de kaart precies zoals vóór `0036`.

**R7.1 — winbaarheid is een kans, geen vlag (migratie `0037`).** `brand_eliciting` was een tekstvlag
en `queue.ts` sloeg elke vraag met `'nee'` over bij een vervolgperiode, terwijl de onderliggende
meting een verhouding is. Op productie gemeten: alle **9** prompts die op `'nee'` stonden, stonden
daar op **precies 2 metingen** — bij n=2 en nul successen loopt de bovengrens van het Wilson-interval
tot ~0,66. Nu tellen `elicit_successes` en `elicit_samples` het bewijs mee, mag een vraag pas
vervallen bij minstens 8 metingen én een bovengrens onder 0,25, en verschijnt de vlag zelf pas vanaf
3 metingen. Met de huidige stand wordt er dus geen enkele overgeslagen — precies de bedoeling.
Onbekend is beter dan verkeerd.

**Aangetoond dat de test kán falen.** Met de reparatie van bug 6 teruggedraaid wordt hij rood op
precies die assertie, en groen zodra hij er weer in zit. Een test die niet aantoonbaar kan falen
bewijst niets — en tijdens het bouwen ving hij al één echte afwijking: de shim gaf geen Postgres-
foutcode terug, waardoor `enqueue()` gooide waar productie netjes doorloopt.

### Daarna, in deze volgorde

1. **De contentronde opnieuw draaien over dezelfde vijf testcases** (~$2, een halve dag). R8 en
   S1–S8 zijn met tests op de echte gevallen getoetst en geen van beide op productie; gebouwd is
   niet hetzelfde als geverifieerd (§2.6). Deze ronde beantwoordt in één keer of de feitenkaart
   voor Coolblue nu de wasmachinepagina's haalt, of de Fysi-Unique-tegenspraak weg is, en of de
   poort de vier pagina's markeert die hun doelvraag ontweken.
2. **De rest van R7 — de meetbasis stabiliseren** (~2 d resterend). R7.1 is gebouwd; wat blijft
   staan is het punt uit §3b: bij 5 winbare vragen is de score formeel nog een getal maar zegt hij
   niets meer. De tellers uit `0037` zijn daar de invoer voor.
3. **R8.9 opnieuw beoordelen.** Na S1 is de vraag alleen nog wat we doen met een klant als Bol,
   waarvan de crawl één pagina zonder bruikbare tekst opleverde. Dat is een gerichte vraag over één
   klanttype, geen onderzoekstraject van 3-5 dagen.
4. **De ketentest uitbreiden naar de meetkant** zodra de rest van R7 gebouwd wordt. De opzet staat
   er; een scenario toevoegen is nu goedkoop. `0037` heeft er al twee kolommen bij gekregen die zich
   deterministisch laten toetsen.

### Daarna: R6.2 en R6.3 (3,5 d)

- **R6.2** Inventariskwaliteitspoort — Bol had 1 pagina in de inventaris, HEMA 40 productpagina's;
  in beide gevallen degradeert het rapport zonder foutmelding. Migratie `0033` gereserveerd.
- **R6.3** Brontype als signaal.

### Blijvend uitgesteld: R0 — Fundament (8 d)

Hygiëne die in de praktijk niets blokkeerde. R4 bleek prima te bouwen zonder R0.5. Eén punt is
wel de moeite van het onthouden waard: **R0.5 is de reden dat de fabrikanten die Bol verkoopt nog
steeds als concurrent meetellen.**

### Losse punten

- `npm run eval:mention` is **nooit gedraaid tegen de gewijzigde mention-prompt**. Vereist een
  API-sleutel. `lib/openai/mention-prompt.ts` is in het bestand zelf omschreven als "de meest
  load-bearing prompt van het hele product" — daar hoort een evaluatie bij.
- De kostenparagraaf in `abcplan.md` §10 gaat nog uit van $0,356 per periode en moet bijgewerkt
  worden nu R2.4 en R6.1 er zijn.
- `GEO-EINDE-TOT-EINDE-PROCES.md` beschrijft de app van vóór R1–R6.1 en is dus op onderdelen
  achterhaald. Bewust nog niet bijgewerkt: het is een momentopname die als nulmeting dient.

---

## 6. Praktisch

### Omgeving

| | |
|---|---|
| Supabase-project | `kosauqzjbpweluiqgmwv` (naam "GEO") |
| Vercel-project | `prj_VyYIOCRAn5nau54fHv7IdvqyXARr`, team `team_gCNH0rm9rhi5DACbVpaJR9zq` |
| Wachtrij | `/api/cron/worker`, aangedreven door Supabase `pg_cron`, elke minuut |

### Vaste controle vóór elke commit

```bash
npx tsc --noEmit      # moet schoon zijn
npm run test:unit     # 384 groen
npm run test:chain    # 24 groen, zonder netwerk en zonder API-sleutel
npm run build         # moet slagen
```

### Migraties toepassen

Schrijf het bestand in `supabase/migrations/`, pas het toe met de Supabase MCP-tool
(`apply_migration`), en werk daarna de migratietabel in `implementatieplan.md` §1 bij. Sluit elke
migratie af met een `select` die controleert dat het gelukt is.

### Instelbaar gedrag

| Env | Standaard | Wat het doet |
|---|---|---|
| `MEASURE_REPEATS` | 3 | Hoe vaak de zwaarste vragen gemeten worden. Op 1 schakelt R6.1 uit. |
| `REPEATED_PROMPT_COUNT` | 8 | Hoeveel vragen herhaald worden. Op 0 schakelt R6.1 uit. |
| `MEASURE_WEB_SEARCH` | aan | Uit = goedkoop ontwikkelen, maar de meting is dan niet representatief. |

### Kosten

Een meetronde kost ongeveer **$0,82** zonder herhalingen; de meting zelf is daarvan ~95%
($0,78 van de $0,82), en de web-zoekactie is ~94% van die meetkosten. Met R6.1 aan komt een
vervolgperiode op ongeveer **$1,06**. Contentgeneratie (`gpt-4.1`) is de enige duurdere post en
is nog nooit op de testdata gedraaid.

### Modellen

Drie tiers, vastgelegd in code: `gpt-4.1-nano` (volume/classificatie), `gpt-4.1-mini` (kwaliteit,
inclusief de meting zelf), `gpt-4.1` (uitsluitend contentschrijven). De meting draait bewust op
mini en niet op nano: met web_search faalde nano 10 van de 10 keer.
