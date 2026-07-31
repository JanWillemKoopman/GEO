# Status doorontwikkeling — overdracht tussen sessies

**Laatst bijgewerkt:** 31 juli 2026 · **Branch:** `main` (alles is gemerged) · **Tests:** 205 groen

Dit document is de brug tussen werksessies. Het beschrijft **wat er af is**, **wat de afspraken
zijn die tijdens het bouwen zijn ontstaan**, en **wat er nog open staat en in welke volgorde**.
Wie hier begint hoeft de rest van de documentatie niet eerst uit te pluizen.

De inhoudelijke onderbouwing staat elders en wordt niet herhaald:

| Document | Wat het is |
|---|---|
| `GEO-EINDE-TOT-EINDE-PROCES.md` | Feitelijke beschrijving van het proces zoals het draait. Alleen feiten, geen meningen. Beschrijft de app van vóór R1–R6.1. |
| `kwaliteitsanalyse-5-testcases.md` | Analyse van 5 echte testanalyses. Bevat de 20 verbeterpunten V1–V20 waar het implementatieplan uit voortkomt. |
| `implementatieplan.md` | **Het werkdocument.** 27 stappen R0.1 t/m R6.3, met per stap bestanden, migraties en verificatiecriteria. Bevat de voortgangstabel. |
| `optimalisatie.md`, `abcplan.md` | De oudere plannen waar de bestaande code naar verwijst in commentaar. |
| `contentbriefing.md` | De specificatie waar R5 op gebouwd moet worden. |

---

## 1. Waar het nu staat

### Opgeleverd (op `main`, in productie)

| Ronde | Wat het oplost |
|---|---|
| **R1** — Bewijslaag | Het rapport verzon welke concurrent een vraag won. Nu krijgt het model een deterministisch bewijsdossier uit de database aangereikt, plus een claimvalidator die achteraf elke merknaam controleert die niet in het dossier staat. |
| **R2** — Meetbaarheid | De score telde "de AI noemde niemand" mee als "jij werd niet genoemd". Nu wordt per antwoord geteld hoeveel aanbieders er genoemd worden; alleen winbare vragen tellen mee in de score, en structureel merkloze vragen worden bij vervolgperiodes overgeslagen. |
| **R3** — Zichtbaarheidsprofiel | `position` stond vol onzin (215 van 521 vermeldingen op 0) en `sentiment` gaf in 650 metingen nooit iets anders dan neutraal. Positie is gerepareerd, sentiment vervangen door `mention_role`, en citaties worden nu geteld. |
| **R4** — Concurrent-intelligence | Concurrenten werden geteld maar niet begrepen. Nieuwe pipelinestap destilleert per concurrent waaróm die genoemd wordt, met een letterlijk citaat per eigenschap. |
| **R6.1** — Gelaagd hermeten | Eén meting per vraag was te wisselvallig om een trendlijn op te tekenen. De zwaarste 8 vragen gaan nu 3× door de meting, en alle aggregatie telt per **vraag** in plaats van per meting. |

### Nog open

| Ronde | Stappen | Effort |
|---|---|---|
| **R0** — Fundament | R0.1 t/m R0.6 | 8 d |
| **R5** — Contentbriefing als klantgate | R5.1, R5.2, R5.3 | 8,5 d |
| **R6.2 / R6.3** | Inventariskwaliteitspoort, brontype als signaal | 3,5 d |

De actuele vinkjes staan in de voortgangstabel van `implementatieplan.md` §2. Dát is de bron van
waarheid; deze tabel is een samenvatting.

### Migraties

Alle migraties t/m `0031` zijn **toegepast op productie**. `0032` en `0033` zijn gereserveerd
(zie de migratietabel in `implementatieplan.md` §1).

| Nr | Ronde | Inhoud |
|---|---|---|
| `0027` | R1 | `reports.stripped_claims_json` |
| `0028` | R2 | `tracking_runs.brands_in_answer`, `prompts.brand_eliciting`, `visibility_scores.winnable_runs`/`brandless_runs` + backfill |
| `0029` | R3 | `mention_role`, `avg_position`, `citation_count`, `first_mention_count` |
| `0030` | R4 | `competitor_breakdown.attributes_json`/`why_summary` |
| `0031` | R6.1 | `tracking_runs.repeat_index` + index `tracking_runs_repeat_idx` |

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

### Eerst: de spreiding van R6.1 meten (~$1,06, een halve dag)

R6.1 is gebouwd maar **nog nooit met herhalingen gedraaid**. Eén periode op Fysi-Unique geeft per
herhaalde vraag hoe vaak het antwoord omslaat. Dat cijfer is om twee redenen belangrijk:

1. Het zegt of drie herhalingen genoeg zijn, of dat `measureRepeats` omhoog/omlaag moet.
2. Het is meteen het antwoord op de vraag hoe betrouwbaar de eenmalige meting al die tijd was —
   waardevolle kennis los van deze stap.

Zonder dit cijfer is R6.1 een aanname die in productie staat. Dit hoort daarom vóór nieuwe
functionaliteit.

### Daarna: R5 — Contentbriefing als klantgate (8,5 d)

De grootste openstaande ronde, en de reden dat het hele traject begon: de klant moet ijzersterke
content krijgen die aansluit op zijn analyse. R1–R4 hebben de grondstof betrouwbaar gemaakt;
R5 is wat er met die grondstof gebeurt.

- **R5.1** Feitenindex + claim-audit (3 d)
- **R5.2** Briefingscherm (3 d) — de klant bevestigt de briefing vóór het schrijven
- **R5.3** Schrijfcontract (2,5 d)

Volgt de specificatie in `contentbriefing.md`. Migratie `0024` is al toegepast; R5 heeft geen
nieuwe migratie nodig. Bouwt op het bewijsdossier uit R1.

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
npm run test:unit     # 205 groen
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
