# Praktijktest — Van den Udenhout, "Private Lease Skoda"

> **Wat dit document is:** de eerste volledige end-to-end doorloop van de app (28 juli 2026), nagerekend tegen de opgeslagen data in Supabase. Elke bevinding hieronder is herleidbaar tot een concrete rij in de database, niet tot een indruk.
>
> **Waarom het bewaard wordt:** dit is het enige moment waarop we precies zien wat de pipeline in de praktijk doet in plaats van wat we hoopten dat hij zou doen. De bevindingen zijn de onderbouwing van de correcties in [abcplan.md](./abcplan.md) en van het ontwerp in [contentbriefing.md](./contentbriefing.md), en fungeren als **regressietest** voor de volgende analyse.

---

## 1. Wat er gemeten is

| | |
|---|---|
| Klant | Van den Udenhout, autodealer Noord-Brabant (udenhout.nl) |
| Onderwerp | Private Lease Skoda |
| Datum | 28 juli 2026, week 0 (nulmeting) |
| Prompts | 30, allemaal actief, allemaal systeem-gegenereerd |
| Runs | 30 (`openai`, purpose `periodic`) |
| Mentions | 22 van de 364 beoordeelde entiteit-regels |
| Score | 10/100 — correct: 3 van de 30 runs noemen de klant |
| Jobs | 48, allemaal `done`, geen enkele mislukt |
| Content | 3 pagina's gegenereerd uit 8 aanbevelingen |
| Kosten | 140 AI-calls |

**De drie vragen waar Van den Udenhout wél gevonden wordt:**
1. "Welke kosten zijn inbegrepen bij een private lease Skoda…" *(Oriëntatie)*
2. "Kan ik mijn oude auto inruilen bij het afsluiten van een Skoda private lease in Den Bosch?" *(Beslissing)*
3. "Wat zijn de voor- en nadelen van private lease ten opzichte van shortlease of huurauto in Den Bosch?" *(Overweging)*

---

## 2. Wat goed werkte

Belangrijk om vast te leggen, want dit zijn de delen die níet veranderd moeten worden:

- **De topic research vindt de echte productpagina met echte prijzen.** `web_search` haalde `udenhout.nl/acties/skoda-private-lease` op inclusief citatie, en daaruit "all-in vanaf €419,-" en "Škoda Scala vanaf €469,-". Dit is de moeilijkste stap van de hele keten en die zit goed.
- **Het merkprofiel doet zijn werk.** Alle vier de `proof_points` (4 jaar garantie, APK €50, 3670 reviews met 9+, gratis APK bij onderhoud) komen correct in de content terecht. De tone-of-voice uit `style_samples` is herkenbaar terug te lezen.
- **De GEO-structuur van de content klopt.** Direct antwoord bovenaan vóór de eerste kop, concrete bedragen, losse citeerbare zinnen, FAQ's onderaan — precies zoals §8 voorschrijft.
- **De volledige audit-trail werkt.** Elke claim in de content was terug te leiden naar de bron-call, elke gap naar de run. **Daarom** kon deze analyse überhaupt gemaakt worden. Het "we bewaren alles"-principe uit §5 betaalt zich hier direct uit.
- **De pipeline is stabiel.** 48 jobs, nul mislukkingen.

---

## 3. Bevindingen en status

| # | Bevinding | Ernst | Status |
|---|---|---|---|
| 1 | 6 van ~13 feitelijke claims in de content niet herleidbaar tot enige bron | **Hoog** | Ontwerp: [contentbriefing.md](./contentbriefing.md) · data: notitie in `review_notes` |
| 2 | Alle 5 gaps verwijzen naar de verkeerde bewijs-run | **Hoog** | Spec: abcplan §B1 — koppeling volledig in code |
| 3 | Rapport noemt de slechtst scorende vraag een "sterk punt" | **Hoog** | Spec: abcplan §B1 · data: samenvatting gecorrigeerd |
| 4 | `content_pieces.title` bevat de instructie i.p.v. de paginakop | Middel | Spec: abcplan §B2 (`pageTitle`) · data: titels gezet |
| 5 | `cluster` liep uit tot 14.341 tekens, kwam in het klantrapport | Middel | Spec: abcplan §A2 · data: opgeschoond + check-constraint |
| 6 | Eigen merk dubbel geteld via alias; Škoda geteld als concurrent | Middel | Spec: abcplan §A3 · data: `entity_role` + SoV herberekend |
| 7 | `geo_score = 100` en `quality_score = 90` voor álle pagina's | Middel | Spec: abcplan §8 — nieuwe scoreopbouw |
| 8 | `existingUrl` verzonnen (`/udenhout.nl/skoda`) | Middel | Spec: abcplan §B2 · data: echte URL gezet |
| 9 | `"telephone": "+31 "` in de schema-markup | Middel | Spec: abcplan §8 · data: veld verwijderd |
| 10 | Categorie "Merkspecifiek" ontbrak — sentiment daardoor betekenisloos | Middel | Spec: abcplan §A2 |
| 11 | Critique-bevindingen niet zichtbaar (`needs_review = false`) | Laag | Spec: abcplan §8 |
| 12 | Revisies niet vastgelegd (`version` blijft 1, `revision_note` leeg) | Laag | Spec: abcplan §8 |
| 13 | 22 van 30 prompts zijn long-tail met volume 10–25 | Laag | Open — zie §6 |
| 14 | Vergelijkingstabel bevat een onjuiste rij die tegen de klant werkt | Middel | Data: notitie in `review_notes` — zie §6 |

Datacorrecties staan in [`migrations/20260729_02_dataopschoning.sql`](./migrations/20260729_02_dataopschoning.sql), schema-uitbreidingen in [`migrations/20260729_01_contentbriefing_schema.sql`](./migrations/20260729_01_contentbriefing_schema.sql).

---

## 4. De claim-audit, uitgevoerd op de echte content

Om te toetsen of het mechanisme uit [contentbriefing.md](./contentbriefing.md) §3 werkt, is het handmatig uitgevoerd op de pagina *"Voordelen private lease vs. zelf kopen"* (967 woorden, `geo_score` 100).

**Feitenindex zoals die op 28 juli beschikbaar was:**

```
F1  All-in vanaf €419,- per maand                      site /acties/skoda-private-lease
F2  Inbegrepen: verzekering, wegenbelasting,
    onderhoud, reparaties, APK                          site /acties/skoda-private-lease
F3  Alleen brandstof voor eigen rekening                site /acties/skoda-private-lease
F4  Škoda Scala vanaf €469,- per maand                  site /acties/skoda-private-lease
F5  4 jaar garantie op werkzaamheden                    profiel, door klant bevestigd
F6  APK € 50,-, keuring binnen een week                 profiel, door klant bevestigd
F7  Gratis APK bij onderhoud of Fijner Rijden Pakket    profiel, door klant bevestigd
F8  Ruim 3670 reviews, gemiddeld 9+                     profiel, door klant bevestigd
F9  Voert o.a. Volkswagen, Audi, SEAT, Škoda, CUPRA     profiel, door klant bevestigd
F10 Vestigingen: Den Bosch, Eindhoven, Breda, Tilburg   profiel
```

**Uitkomst van de audit — 16 beweringen:**

| Bewering in de tekst | Gedekt | Belang |
|---|---|---|
| Vast all-in maandbedrag vanaf €419,- | ✅ F1 | kern |
| Verzekering, wegenbelasting, onderhoud, reparaties, APK inbegrepen | ✅ F2 | kern |
| Alleen brandstof zelf betalen | ✅ F3 | kern |
| Geen aanbetaling of grote investering vooraf | ⚠️ aannemelijk, niet in index | kern |
| Rijden in een nieuw of zeer jong model | ⚠️ aannemelijk, niet in index | ondersteunend |
| **Leasecontracten mogelijk vanaf 24 maanden** | ❌ | kern |
| **Keuze uit diverse kilometerbundels** | ❌ | kern |
| Waardeverlies ligt bij het bedrijf | ⚠️ aannemelijk, niet in index | ondersteunend |
| Onderhoud, reparaties en APK inbegrepen, mét 4 jaar garantie | ✅ F2 + F5 | kern |
| Snelle keuring binnen een week, gratis APK bij onderhoud | ✅ F6 + F7 | ondersteunend |
| **Schade en pech gedekt binnen het leasecontract** | ❌ | kern |
| **Pechhulp inbegrepen** | ❌ | kern |
| Inleveren aan het einde van het contract | ⚠️ aannemelijk, niet in index | ondersteunend |
| 3670 reviews met een 9+ | ✅ F8 | ondersteunend |
| Mobiliteitspartner in Noord-Brabant | ✅ F10 | ondersteunend |
| **Bij kopen rij je niet in het nieuwste model** | ❌ **feitelijk onjuist** | — |

**De audit vindt exact de zes verzonnen claims uit de feitencheck terug**, plus de onjuiste tabelrij die bij de handmatige controle pas als laatste opviel. Vier claims worden terecht als "aannemelijk maar onbewezen" gemarkeerd: generieke eigenschappen van private lease die geen belofte van déze klant zijn — die mogen blijven staan (regel 4 van het schrijfcontract), maar zonder ze aan Van den Udenhout toe te schrijven.

### De vragen die hieruit volgen

Na ontdubbeling over alle drie de gekozen pagina's en sortering op impact, zou de klant deze briefing hebben gekregen:

| # | Vraag | Soort | Type | Verplicht | Raakt |
|---|---|---|---|---|---|
| 1 | Op je site staat "all-in vanaf €419,- per maand". Klopt dat nog? | verificatie | ja_nee + bedrag | nee | 3 pagina's |
| 2 | Zit pechhulp in het maandbedrag? | aanvulling | ja/nee/deels | **ja** | 2 |
| 3 | Krijgt een klant vervangend vervoer bij onderhoud of schade? | aanvulling | ja/nee/deels | **ja** | 2 |
| 4 | Is schadeherstel inbegrepen, of loopt dat via de verzekering? | grenzen | keuze | **ja** | 2 |
| 5 | Wat is de kortste looptijd die je aanbiedt, en welke kilometerbundels? | aanvulling | tekst_kort | **ja** | 2 |
| 6 | Kan een particulier bij jullie ook financial lease afsluiten voor een Škoda? | grenzen | ja_nee | **ja** | 1 |
| 7 | ChatGPT noemt bij "hoe vergelijk ik lease-aanbiedingen" nu ANWB Lease, Leasen24 en HelloLease — jou niet. Wat kun jij wat zij niet kunnen? | onderscheid | tekst_lang | nee | 3 |
| 8 | Telefoonnummer en adres van de vestiging in Tilburg? | praktisch | tekst_kort | **ja** | 1 |

Acht vragen, geen ervan vereist opzoekwerk, samen naar schatting **twee minuten invullen**. Ze zouden alle zes de verzinsels hebben voorkomen, de kapotte schema-markup hebben gevuld, en met vraag 7 het enige stuk informatie hebben opgehaald dat principieel niet uit een crawl te halen is.

> **Dit is de kern van de zaak:** de app had de informatie niet, maar de klant wel — en er was nooit een moment waarop ernaar gevraagd werd.

---

## 5. Acceptatiecriteria voor de volgende analyse

Concreet en toetsbaar. Elk criterium is met één query te controleren.

**Meten**
- [ ] Geen enkele prompt heeft `length(cluster) > 120`
- [ ] Minstens 6 prompts noemen de klantnaam letterlijk (categorie Merkspecifiek)
- [ ] Het eigen merk telt maximaal één keer per run, ongeacht schrijfwijze
- [ ] Geen enkele entiteit met `entity_role <> 'concurrent'` telt mee in share-of-voice
- [ ] `score` en `share_of_voice` zijn met dezelfde teleenheid berekend en spreken elkaar niet tegen

**Rapporteren**
- [ ] Elke `evidenceRunId` verwijst naar een run waarvan de prompt daadwerkelijk over dat cluster gaat
- [ ] Elke genoemde concurrent komt daadwerkelijk voor in `tracking_run_mentions` van die run
- [ ] Elke genoemde sterkte komt uit een run met `is_own_brand AND mentioned`
- [ ] Elke `existingUrl` is een absolute URL die voorkomt in `profile_pages` of `topic_research`
- [ ] Geen enkele cluster- of intent-string in het rapport is langer dan 120 tekens

**Briefen**
- [ ] Elke gegenereerde vraag is in ≤ 30 seconden te beantwoorden zonder opzoekwerk
- [ ] Geen vraag wordt gesteld waarvan het antwoord al in de feitenindex staat
- [ ] Maximaal 8 vragen per batch, ontdubbeld over de gekozen pagina's
- [ ] Doorklikken zonder antwoorden is mogelijk en toont eerlijk wat het kost

**Schrijven**
- [ ] `source_coverage = 100%` óf `needs_review = true` — nooit allebei niet
- [ ] Elke bewering over de klant is herleidbaar tot een F-nummer
- [ ] `title` bevat geen werkwoord in de gebiedende wijs ("Maak…", "Leg…", "Ontwikkel…")
- [ ] Schema-markup bevat geen leeg of half gevuld verplicht veld
- [ ] `geo_score` en `quality_score` verschillen aantoonbaar tussen pagina's van verschillende kwaliteit
- [ ] Elke openstaande critique-bevinding staat in `review_notes`

---

## 6. Wat bewust nog openstaat

**Promptverdeling (bevinding 13).** 22 van de 30 prompts zijn `long_tail` met een geschat volume van 10–25; slechts 4 zitten in de band "hoog". De zichtbaarheidsscore wordt daardoor gedomineerd door vragen die bijna niemand stelt. Een gewogen score bestaat al technisch (`visibility_scores.weighted_score`, `prompts.volume_estimate`), maar wordt in de UI niet als hoofdgetal gebruikt. **Nog te beslissen:** sturen we op de verdeling bij het genereren, of tonen we de gewogen score als hoofdgetal? Beide kan, maar niet zonder keuze — en het raakt de belofte van "één helder getal" uit README §2.

**De strategische spanning in de content (bevinding 14).** De gegenereerde vergelijkingstabel zet zeven nadelen van *kopen* tegenover private lease. Van den Udenhout is een autodealer wiens kernactiviteit autoverkoop is. Zo'n tabel op de eigen site kannibaliseert het hoofdproduct. De aanbeveling volgde hier de formulering van de prompt ("t.o.v. zelf kopen") zonder te toetsen aan de business van de klant.

Dit is geen bug maar een ontwerpvraag: **moet de app weten welke producten de klant níet wil beconcurreren met eigen content?** Het meest voor de hand liggende antwoord is een extra briefingvraag van de soort *grenzen*: *"Deze pagina vergelijkt private lease met zelf kopen. Wil je dat we kopen als minder aantrekkelijk neerzetten, of allebei als volwaardige opties?"* Voorstel: meenemen zodra de briefing staat, niet eerder — eerst het verzinnen stoppen.

---

*Nagerekend op 29 juli 2026 tegen de Supabase-data van project GEO (`kosauqzjbpweluiqgmwv`).*
