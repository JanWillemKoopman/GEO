# Overdracht: de expertfeedback verwerken

**Voor een nieuwe Claude Code-sessie.** Geschreven op 4 september 2026, aan het eind van de sessie
die de contentkwaliteit heeft aangepakt. Dit document vervangt het gesprek dat toen liep.

Verwijder dit bestand zodra de feedback verwerkt is en de beslissingen in `docs/logbook.md` staan.

---

## 1. De opdracht van de nieuwe sessie

De product owner heeft de contentpijplijn laten doorlichten door **twee externe experts**: een
copywriter en een AI-expert. Zij hebben `docs/contentpijplijn-overdracht.md` gekregen, een document
dat elke AI-aanroep in de schrijfketen beschrijft met de prompts erin, en dat eindigt met tien
concrete vragen aan hen.

Hun antwoorden komen binnen als losse tekst, waarschijnlijk geplakt in het gesprek.

**Wat er moet gebeuren:** die feedback omzetten naar echte verbeteringen in de app. Niet naar een
samenvatting, niet naar een plan dat blijft liggen, maar naar code, prompts en migraties die
draaien.

---

## 2. Hoe je dat aanpakt

Dit is de werkwijze die in de vorige ronde werkte, met dezelfde externe copywriter. Volg hem, want
hij is duur betaald.

### Stap 1. Bewaar de feedback letterlijk voordat je hem interpreteert

Zet de ruwe tekst ongewijzigd in `content-reviews/feedback/`, met de datum en de rol van de expert
in de bestandsnaam. Zoals `copywriter-extern-3-september-2026.md` dat al doet. Reden: elke
vertaalslag die je daarna maakt is jouw interpretatie, en die moet naast het origineel te leggen
zijn. Wij hebben in de vorige ronde een keer moeten terugkijken of een verwijt echt zo bedoeld was,
en toen was dat er nog.

### Stap 2. Splits elk punt in drie soorten

Niet elk punt van een expert is een codewijziging. Sorteer ze:

| Soort | Wat je ermee doet |
|---|---|
| **Een instructie die anders moet** | een promptblok wijzigen, plus het vangnet in code ernaast |
| **Een stap die ontbreekt** | een nieuw jobtype of een nieuwe pure module |
| **Een aanname die niet klopt** | eerst narekenen op `ai_calls` of in de code, dan pas iets bouwen |

Er zit vaak een vierde bij: een punt dat al gebouwd is maar dat de expert niet kon zien omdat het
document het te kort beschreef. Dat is geen codewerk maar een documentatiefout, en die hoort ook
opgelost.

### Stap 3. Zeg wat je NIET gaat doen, en waarom

De vorige ronde leverde dertien verbetervoorstellen op waarvan er twaalf gebouwd zijn. De
dertiende, V11, stuurt nog steeds niets. Dat staat opgeschreven in plaats van verzwegen. Doe dat
weer: een expert die vijf dingen zegt en ziet dat er vier gebeuren met een reden bij de vijfde,
vertrouwt de volgende ronde.

### Stap 4. Elke wijziging krijgt een vangnet en een test

Code-conventie 1: elke promptinstructie krijgt een deterministische controle in code. Elke
wijziging die een uitkomst beïnvloedt krijgt een test in `scripts/test-unit.ts`, elke wijziging in
de samenhang tussen taken een scenario in `scripts/test-chain.ts`.

### Stap 5. Werk het logboek bij in dezelfde commit

Een nieuwe beslissing gaat als alinea met datum en cijfer onderaan `docs/logbook.md`. Herschrijf
nooit een oudere alinea om een fout te verbergen; zet er een nieuwe onder die zegt wat er veranderd
is. Dat is in deze sessie twee keer gebeurd en het maakte het verhaal beter, niet slechter.

### Stap 6. Werk het overdrachtsdocument bij

`docs/contentpijplijn-overdracht.md` beschrijft de pijplijn zoals hij is. Verandert de pijplijn, dan
verandert dat document mee, anders klopt het niet meer bij de volgende doorlichting. Er staat ook een
gepubliceerde versie van als webpagina; vraag de eigenaar of die bijgewerkt moet worden.

---

## 3. Waar je begint met lezen

In deze volgorde, en niet meer dan dit:

1. **`docs/contentpijplijn-overdracht.md`** , wat de experts hebben gezien. Dit is verreweg het
   belangrijkste, want hun feedback verwijst ernaar. Elke AI-aanroep, elke prompt, elke controle.
2. **`docs/tasks/contentkwaliteit-copywriterronde.md`** , het plan van de vorige ronde. Dertien
   voorstellen (V1 tot en met V13), wat er gebouwd is, en paragraaf 7 met wat er open staat.
3. **`content-reviews/feedback/copywriter-extern-3-september-2026.md`** , wat de eerste externe
   copywriter zei. Als de nieuwe feedback iets herhaalt, staat het hier al.
4. **`docs/logbook.md`, de laatste vijf alinea's** , wat er de afgelopen week besloten is en waarom.
5. **`CLAUDE.md`** , de werkregels. Lees die echt, ze zijn kort en ze overrulen je gewoontes.

Pas daarna de code. `lib/pipeline/content.ts` is het hart en telt 2437 regels; ga er gericht in met
Grep in plaats van hem uit te lezen.

---

## 4. Wat er in de vorige sessie is gebeurd

Zodat je niet opnieuw voorstelt wat er net gebouwd is.

### De aanleiding

Twaalf pagina's zijn op 3 september 2026 geschreven voor twee echte klanten, MJB Dakservice en
Fysio Centrum Utrecht. Een externe copywriter heeft ze blanco beoordeeld. Zijn oordeel over de hele
stapel:

> De teksten weten wat het bedrijf doet en wat de lezer wil weten, maar nog onvoldoende waarom deze
> lezer dit bedrijf zou moeten kiezen.

Overtuigingskracht scoorde 2,6 van 5, zijn laagste cijfer.

### Wat daaruit gebouwd is

Twaalf van de dertien voorstellen, elk met een promptblok én een controle in code:

| Code | Wat het doet | Nieuwe module |
|---|---|---|
| V7 | elke pagina krijgt één lezer, één probleem, één beslissing | `lib/lezersopdracht.ts` |
| V2 | de aanspreekvorm wordt altijd gekozen, en nooit gemengd | `tone-sliders.ts` uitgebreid |
| V3 | de pagina schrijft niet meer over haar eigen totstandkoming | `content-gate.ts` uitgebreid |
| V5 | een klantinstructie is een verbod, geen feit | `lib/klantinstructies.ts` |
| V9 | van feit naar betekenis voor de lezer | `lib/pipeline/bewijspunten.ts` |
| V4 | de eigen woorden van de ondernemer blijven staan | `lib/pipeline/klantcitaten.ts` |
| V8, V1, V10 | opening bij de lezer, wij-vorm, minder vraagkoppen | `lib/pipeline/paginavorm.ts` |
| V6 | minder adviseren, geen consumentengids | `lib/pipeline/adviestoon.ts` |
| V12 | minder herhaling tussen pagina's van dezelfde ronde | `similarity.ts` uitgebreid |
| V13 | de beoordelaar leren onderscheiden | `quality-benchmark.ts`, `content-panel.ts` |

Plus migratie `0093` (`proof_points_json` op `content_pieces`) en een zevende dimensie
(`herkenning`) bij de vakmanschapsbeoordelaar die wel scoort maar nog niet meeweegt.

### En daarna, op 4 september

De contenttier is van `gpt-5.6-sol` ($5 en $30 per miljoen tokens) naar `gpt-5.6-terra` ($2 en $12)
gegaan. Twaalf pagina's kosten daarmee $3,69 in plaats van $7,43. De redenering staat in
`lib/openai/models.ts` en in het logboek.

---

## 5. De belangrijkste openstaande bevinding

**De vakmanschapsbeoordelaar heeft het juiste niveau en de verkeerde volgorde.**

Naast het oordeel van de echte copywriter gelegd, over dezelfde twaalf pagina's:

- niveau: gemiddeld **0,14 punt** van het menselijke oordeel af. Dat is goed.
- rangorde: rangcorrelatie **+0,29**, en van de vier pagina's die hij als zwakste aanwees waren er
  twee de verkeerde. De pagina die de copywriter gedeeld slechtste noemde, "absoluut niet
  versturen", stond bij onze beoordelaar op de derde plaats van boven.

Dat is precies het verkeerde soort fout, want de reparatiestap kiest op rangorde. De app repareert
dus de verkeerde pagina's. `rangcorrelatie()` in `lib/quality-benchmark.ts` meet dit nu, met een norm
van 0,6 en een minimum van vijf beoordeelde pagina's.

**Als de AI-expert hier iets over zegt, heeft dat voorrang op al het andere.** Wij hebben er zelf één
poging op gedaan (menselijke ijkpunten in de prompt van `content-panel.ts`), en die is niet
geverifieerd.

---

## 6. Wat er verder open staat

Uit `docs/tasks/contentkwaliteit-copywriterronde.md` §7, ongewijzigd:

1. **De nameting is niet gedaan.** Twaalf tellingen kunnen groen worden zonder dat de tekst beter
   wordt. De enige meting die telt: dezelfde twaalf onderwerpen opnieuw laten schrijven en opnieuw
   blanco voorleggen aan dezelfde copywriter. Kosten ongeveer $3,70 plus een dagdeel van hem.
2. **Zeven drempels rusten op één ronde van twaalf pagina's.** Gekozen, niet geijkt.
3. **De modelwissel is niet los te toetsen.** De nameting toetst nu twee dingen tegelijk.
4. **Het kalibratielab is leeg.** `content_quality_reviews` en `/beheer/kwaliteit` bestaan, er zijn
   twintig menselijke beoordelingen nodig en er zijn er nul.
5. **V11 stuurt nog niets.**
6. **De FAQ-blokken zijn niet aangeraakt.** Overlappen inhoudelijk met de tekst erboven.
7. **De vraag van de copywriter is niet beantwoord.** Geen enkele stap vraagt expliciet waarom deze
   lezer dit bedrijf zou moeten kiezen.

---

## 7. Vier valkuilen waar deze sessie in is gelopen

Lees dit voordat je begint. Alle vier zijn echt gebeurd.

### Neem geen cijfer uit documentatie over

De documentatie zei dat een schrijfaanroep $0,071 kostte. Nagemeten op `ai_calls` was het $0,2578,
dus 3,6 keer meer. Op basis van het verkeerde cijfer is een kostenraming van $4,30 aan de eigenaar
gegeven die $7,43 had moeten zijn. **Draai de query, kijk in de map, tel het na.** Dit staat als
conventie in `CLAUDE.md` en het is daar niet voor niets zo hard geformuleerd.

Nuttige tabellen: `ai_calls` (kolommen `kind`, `model`, `input_tokens`, `output_tokens`,
`web_search`, `cost_usd`, `content_piece_id`), `content_pieces`, `content_quality_runs`. Er is geen
`duration_ms`.

### Een AI die AI-tekst beoordeelt, is te streng

In deze sessie is er eerst een eigen beoordelingsronde over de twaalf pagina's gedaan, in de rol van
copywriter. Toen de echte copywriter zijn cijfers gaf, bleek die eigen ronde **0,75 tot 2,25 punt te
laag** op elke gedeelde dimensie, terwijl de vakmanschapsbeoordelaar van de app er 0,05 tot 0,32
naast zat. Een AI die AI-tekst beoordeelt herkent de patronen en straft ze zwaarder af dan een lezer
dat doet.

Gevolg voor jou: **de tellingen uit die ronde zijn bruikbaar, de cijfers niet.** "Elf van de twaalf
openingen begint bij het bedrijf" is een feit. "Overtuigingskracht 2 van 5" was dat niet.

### Een controle die overal afgaat is ruis

De eerste drempels voor de adviestoon (V6) stonden op 0,35 en 0,5 per honderd woorden en sloegen aan
op **elf van de twaalf** pagina's. Dat zou de reparatie van elke pagina met dezelfde bevinding
vullen. Ze staan nu op 0,6 en 0,8, waar de uitschieters beginnen, en gaan af op vijf van de twaalf.

Meet de verdeling voordat je een drempel kiest. Schrijf de gemeten spreiding in het commentaar.

### Schrijf nooit dat iets al kan wat nog niet gebouwd is

Dit staat in `CLAUDE.md` en het geldt ook voor je antwoorden aan de eigenaar. `merkstrategie.md` §30
houdt bij waar bouw en belofte uit elkaar lopen.

---

## 8. De harde regels

- **Branch vanaf `main`.** `main` is productie en deployt automatisch naar Vercel. De agent kan niet
  rechtstreeks naar `main` pushen; dat gaat via een pull request die de eigenaar goedkeurt.
- **Volgorde:** migratie eerst, dan code, dan UI.
- **Vóór elke commit vier keer groen:** `npx tsc --noEmit`, `npm run test:unit`,
  `npm run test:chain`, `npm run build`. Geen uitzonderingen.
- **Migraties** via de Supabase MCP-tool (`apply_migration`), additief en idempotent, nooit `drop`.
  Werk daarna de index in `supabase/README.md` bij.
- **Taal:** app, prompts, code en antwoorden in het Nederlands. Antwoorden aan de eigenaar zijn te
  begrijpen zonder technische kennis: de zin moet kloppen als je de functienamen wegstreept, en zeg
  het gevolg van een cijfer en niet alleen het cijfer.
- **Geen gedachtestreepjes en geen "en/of"**, overal, ook in code en prompts. Zie
  `docs/schrijfstijl.md` §10 voor de grep-check.
- **De eigenaar is geen ontwikkelaar.** Een opdracht komt binnen als een wens. Vraag alleen wat de
  uitkomst wezenlijk verandert; kies verder zelf, benoem de keuze, ga door.
- **Kosten zijn een ontwerpvariabele.** Zet `MEASURE_WEB_SEARCH=false` om goedkoop te ontwikkelen.

---

## 9. Waar de dingen staan

| Onderwerp | Bestand |
|---|---|
| De schrijfstap, alle prompts | `lib/pipeline/content.ts` |
| De vier beoordelaars | `lib/pipeline/content-panel.ts` |
| De keuring als geheel | `lib/pipeline/quality-run.ts` |
| De controles in code | `lib/pipeline/content-gate.ts` |
| Score, zekerheid, oordeel | `lib/pipeline/quality-score.ts` |
| De twaalf dimensies | `lib/pipeline/quality-dimensions.ts` |
| De vier profielen | `lib/pipeline/quality-profile.ts` |
| Onderzoek per pagina | `lib/pipeline/item-dossier.ts` |
| De inhoudsopgave | `lib/pipeline/content-contract.ts` |
| De feitenkaart | `lib/pipeline/factcard.ts`, `lib/pipeline/fact-atomise.ts` |
| Claim-audit en vragenlijst | `lib/pipeline/briefing.ts` |
| De poort vóór het schrijven | `lib/content-input-gate.ts` |
| De reparatieopdracht | `lib/pipeline/quality-repair.ts` |
| Modellen en instellingen | `lib/openai/models.ts`, `lib/openai/sampling.ts` |
| De ijking tegen mensen | `lib/quality-benchmark.ts`, `app/(app)/beheer/kwaliteit/` |
| De negen nieuwe controles | `lib/lezersopdracht.ts`, `lib/klantinstructies.ts`, `lib/pipeline/bewijspunten.ts`, `lib/pipeline/klantcitaten.ts`, `lib/pipeline/paginavorm.ts`, `lib/pipeline/adviestoon.ts` |

---

## 10. Cijfers die je mag hergebruiken

Allemaal nagemeten op `ai_calls`, ronde van 3 september 2026, twee klanten, twaalf pagina's,
328 aanroepen.

| Stap | Aanroepen | Per aanroep (Sol) | Per aanroep (Terra) |
|---|---|---|---|
| `content_draft` | 12 | $0,2578 | ongeveer $0,113 |
| `content_revise` | 16 | $0,2078 | ongeveer $0,083 |
| `item_dossier` | 12 | $0,0161 | ongewijzigd |
| `content_contract` | 12 | $0,0064 | ongewijzigd |
| de vier beoordelaars samen | 52 keuringen | $0,0119 | ongewijzigd |
| **hele ronde** | **328** | **$7,43** | **ongeveer $3,69** |

Tokengebruik: `content_draft` 15.845 in en 5.925 uit met web-zoekactie, `content_revise` 13.625 in
en 4.657 uit zonder.

De negen mechanische patronen van vóór de verbeteringen, als nulmeting:

| Wat | Gemeten |
|---|---|
| pagina's zonder aangewezen lezer | 8 van 12 |
| openingen die bij het bedrijf beginnen | 11 van 12 |
| merknaam in de derde persoon, tegenover 2x "wij" | 164 keer |
| koppen die een vraag zijn | 169 van 228 |
| zinnen die de lezer huiswerk geven | 72 |
| slappe formuleringen op 13.605 woorden | 120 |
| "je" naast "u" door elkaar | 95 en 81 |
| klantantwoorden waarvan de reden wegviel | 4 pagina's |
| pagina's die de bezoeker wegsturen om te vergelijken | 3 |
