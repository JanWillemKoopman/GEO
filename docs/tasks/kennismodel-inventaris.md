# Inventaris van alle klantkennis (werkpakket F0.2)

**Opgesteld:** 26 september 2026, als werkpakket F0.2 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`.
**Status:** af. De eigenaar heeft de tabel gezien en de drie vragen van §6 beantwoord (26 september
2026). Er is geen code en geen migratie veranderd.

Dit document zegt per kolom wat er vandaag over een bedrijf wordt vastgelegd, wie het schrijft, wie het
leest, en wat er in de kennislaag (`klantkennis`, §6.1 van het plan) mee moet gebeuren. K1 legt het
datamodel vast met dit document ernaast, K3 vult terug volgens de kolom "Voorstel", en K8 bewaakt dat
de kolommen met "niet meer gebruiken" nergens meer gelezen worden.

---

## 1. Hoe dit is nagekeken

- **Kolommen:** rechtstreeks uit `information_schema.columns` op productie (project GEO), niet uit
  `lib/types/database.ts`. De aantallen kloppen met het plan: `profiles` 94, `brand_facts` 22,
  `profile_offerings` 19, `profile_facets` 11, `profile_strategy` 6, `fact_requests` 23,
  `brand_documents` 9. Daarbij `profile_field_sources` (9), omdat het plan die als herkomst noemt.
  **Samen 193 kolommen, en elke kolom heeft hieronder een rij.**
- **Gevuld:** geteld op productie op 26 september 2026. Een lege lijst, een lege tekst en `null` tellen
  als leeg. Bij `profiles` is het "x van 3 merken"; bij de andere tabellen "x van het aantal rijen".
  Een kolom met een standaardwaarde (`false`, `0`) telt altijd als gevuld.
- **Schrijft en leest:** gezocht met `grep -rnw <kolom> app lib components scripts`, zonder
  `lib/types/database.ts` en zonder de tests. Daarna per kolom de treffers gelezen, want een grep op
  kolomnaam telt ook wat alleen in commentaar, in een voorbeeldtekst (`brand-examples.ts`) of in de
  veldencatalogus van het formulier (`brand-fields.ts`) staat. Die drie tellen hier niet als lezer.
  Bij algemene namen (`name`, `status`, `text`, `source`) is gekeken naar de uitvragen op die tabel
  (`.from("<tabel>")`), niet naar de losse naam.
- **"Alleen het formulier"** betekent: de kolom staat op "merkprofiel bewerken" en in het
  gespreksscherm, de route slaat hem op, en geen enkele stap van onderzoek, meting, rapport of schrijven
  leest hem.

### Wat de kolommen betekenen

| Kolom | Waarden |
|---|---|
| Domein | De negen domeinen van §6.1: identiteit, aanbod, doelgroep, positionering, bewijs, stem, verhaal, grens, geleerd. "Geen" voor wat niets over het bedrijf zegt |
| Status | Wat de status in de kennislaag zou worden, gezien wie de waarde vandaag zet. **waargenomen** (uit een bron, met citaat), **verklaard** (de klant of de consultant zei het), **bevestigd**, **afgeleid** (een model denkt het). "Gemengd" als één kolom waarden van verschillende herkomst bevat |
| Gebruik | **content** (mag op een pagina), **intern** (alleen voor vragen, kansen en analyse), **verboden** (de klant zei: dit niet) |
| Voorstel | **meenemen** (wordt een kennisitem), **alleen herkomst** (wordt een veld van een kennisitem, zoals `bron`, `citaat` of `herkomst_id`, geen eigen item), **niet meer gebruiken** (geen item, en K8 laat een test falen als de kolom nog gelezen wordt), **geen klantkennis** (techniek, boekhouding of een vraag; blijft waar hij staat en valt buiten dit plan) |

De vierde waarde, "geen klantkennis", staat niet letterlijk in F0.2. Hij is nodig omdat "elke kolom
heeft een rij" ook de crawlinstellingen, de koppeling met Search Console en de boekhouding van een
vraag raakt. Die zeggen niets over het bedrijf en horen niet in `klantkennis`, maar ze worden ook niet
"niet meer gebruikt".

---

## 2. De uitkomst in cijfers

| Voorstel | Aantal kolommen |
|---|---|
| Meenemen | 55 |
| Alleen herkomst | 36 |
| Niet meer gebruiken | 37 |
| Geen klantkennis | 65 |
| **Totaal** | **193** |

Per tabel: `profiles` 94, `brand_facts` 22, `profile_offerings` 19, `profile_facets` 11,
`profile_strategy` 6, `fact_requests` 23, `brand_documents` 9, `profile_field_sources` 9. Nagerekend
door de rijen van §4 te tellen.

**Niet meer gebruiken, 37 kolommen**, in vier groepen:
1. **22 kolommen van `profiles` die niemand leest en die op productie bij alle drie de merken leeg
   zijn:** de zeven auteursvelden, de vijf stemschuiven, `audience_knowledge_level`, `key_messages`,
   `identity_keywords`, `signature_phrases`, `brand_mission`, `brand_positioning`, `usp`,
   `audience_secondary`, `compliance_notes` en `customer_questions`. Twaalf daarvan staan nog op het
   formulier (de auteursvelden, missie, positionering, `usp`, tweede doelgroep en de wettelijke
   beperkingen); de andere tien kan niemand meer invullen.
2. **Drie kolommen van `profiles` die wel gevuld worden maar door niemand gelezen:** `tone_of_voice`,
   `style_samples` en `proof_points`.
3. **Zes herkomstkolommen die nooit gevuld worden:** `brand_facts.origin_fact_request_id`,
   `origin_document_id`, `verify_after` en `citable` (die laatste altijd "waar", en ongelezen);
   `profile_field_sources.evidence_url` en `evidence_quote`.
4. **Zes resten:** `fact_requests.fact_ref`, `section_id`, `section_refs` en `suggested_answer`, en
   het zelfoordeel van het model in `profile_offerings.confidence` en `profile_facets.confidence`.

---

## 3. Wat opviel

Deze punten veranderen het plan niet van richting, maar een paar ervan zeggen iets anders dan §2 van
het plan. Die staan in §6 als vraag aan de eigenaar.

1. **De herkomst van feiten is dunner dan §2 van het plan zegt.** Alle 33 feiten in `brand_facts` komen
   uit de samenvatting van het onderzoek (`kind = site`, `stand = site`). `origin_fact_request_id` en
   `origin_document_id` bestaan, maar geen enkele regel code vult ze, en er is geen enkel feit met
   `kind = klant`. Een beantwoorde vraag wordt nooit een rij in `brand_facts`.
2. **Het citaat van een feit wordt gecontroleerd en daarna weggegooid.** `synthesis.ts` controleert of
   het citaat letterlijk op de bronpagina staat, maar `brand_facts` heeft geen kolom voor dat citaat.
   Het staat nog wel in de ruwe uitvoer (`profile_facets`, facet `synthese`,
   `raw_json.output_parsed.facts`): **alle 33 feiten zijn daar met hun citaat terug te vinden.** Maar
   die ruwe uitvoer wordt bij elke nieuwe onderzoeksronde overschreven. K3 moet het citaat daar dus
   ophalen zolang het er nog staat, anders mag geen enkel feit de status *waargenomen* krijgen (§6.1
   eist een citaat).
3. **Feiten uit een geplakt document landen niet in `brand_facts` maar in `fact_requests`**, als
   beantwoorde merkvraag (`app/api/profiles/[id]/dossier/route.ts`). Op productie is er nog geen
   document geplakt (`brand_documents` heeft nul rijen).
4. **`proof_points` is een mengbak zonder lezer.** Bij de drie merken staan er 27 regels in. 15 daarvan
   zijn een kopie van een beantwoorde vraag ("vraag antwoord", geschreven door `answerFact()`), de
   andere 12 komen uit het merkonderzoek zonder bron of citaat. Sinds de nieuwe contentketen leest geen
   enkele stap de kolom nog; alleen de volledigheidsmeter en het gespreksscherm tonen hem. Een nieuwe
   onderzoeksronde overschrijft de hele lijst, ook de kopieën van antwoorden (die staan gelukkig ook in
   `fact_requests`).
5. **Blok A bevat vandaag iets wat alleen een model denkt.** `value_props` komt uit het merkonderzoek
   (een model, zonder citaat) en gaat als "Waar het bedrijf voor staat" naar de schrijver
   (`lib/pagina/context.ts`, `bedrijfskennis.ts`). Onder de regels van §6.1 is dat *afgeleid*, en dat
   mag nooit in blok A (§4 regel 4). K6 haalt het eruit; tot die tijd is dit de enige plek waar de
   schrijver AI-oordeel als bedrijfskennis krijgt.
6. **`differentiator` gaat naar de schrijver maar is bij alle drie de merken leeg.** De kolom is in orde,
   het gesprek vult hem alleen niet.
7. **`deal_value_band` heeft geen lezer, maar N1 heeft hem nodig.** De commerciële waarde van een kans
   (§6.2) komt uit de commerciële prioriteiten van het merk. Daarom "meenemen", ook al leest niemand
   hem nu.
8. **Commentaar verwijst naar code die niet meer bestaat.** Vijf bestanden noemen `buildFactBase()`
   (onder meer `lib/facts.ts` en `lib/proof-point-regel.ts`) als de weg waarlangs een antwoord de
   schrijver bereikt. Die functie bestaat niet meer; antwoorden bereiken de schrijver nu via
   `antwoordenVoorBlokA()` en `klantinput()`. Iets voor K8, niet voor nu.
9. **Een aanpassing van de consultant aan de aanbodboom houdt het citaat van het model.** Na een
   wijziging zet de route `source` op de consultant, maar `evidence_quote` blijft de tekst die het model
   op de site vond. K3 moet een aangepaste knoop dus als *verklaard* terugvullen, niet als *waargenomen*.
   Op productie is dat nog niet gebeurd: alle 85 knopen hebben `source = ai`.
10. **Een aantal velden stuurt de machine en is tegelijk kennis.** `brand_name`, `aliases`,
    `name_exclusions`, `service_scope`, `service_regions`, `competitors` en `market_language` bepalen hoe
    er gemeten wordt en welke meetvragen er komen. Ze zijn kennis over het bedrijf en gaan dus mee, maar
    de meting leest ze nu rechtstreeks uit `profiles`. In de tabellen staan ze als "meenemen
    (stuurveld)". Hoe ze na K8 bij de meting komen, is beslist in §6 punt 2 (besluit V9).

---

## 4. De tabellen

### 4.1 `profiles` (94 kolommen, 3 merken)

**Identiteit**

| Kolom | Wat het is | Gevuld | Domein | Status | Gebruik | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|---|---|
| `id` | Sleutel van het merk | 3 | geen | | | aanmaken | overal | geen klantkennis (wordt `profile_id`) |
| `user_id` | Eigenaar van de rij | 3 | geen | | | aanmaken, toewijzen | toegang, verwijderen | geen klantkennis |
| `account_id` | Het klantaccount | 3 | geen | | | toewijzen | toegang | geen klantkennis |
| `name` | Naam waaronder het merk is aangemaakt | 3 | geen | | | aanmaken, formulier | overal, ook de schrijver als `brand_name` leeg is | geen klantkennis (werknaam; de merknaam zelf is `brand_name`) |
| `url` | Website | 3 | geen | | | aanmaken, formulier | crawler, meting, schrijver | geen klantkennis (technische sleutel voor crawl en meting) |
| `brand_name` | Naam zoals klanten hem kennen | 3 | identiteit | afgeleid of verklaard | content | merkonderzoek (`prepare-profile.ts`, mens wint), formulier | schrijver, meting, kennistest, markt, rapport, onderwerpen | meenemen (stuurveld) |
| `aliases` | Andere namen van het merk | 3 | identiteit | verklaard (gesprek) | intern | formulier, gesprek, `strategy/route.ts` | meting (eigen merk herkennen), kennistest, markt, reputatie | meenemen (stuurveld) |
| `name_exclusions` | Gelijknamige bedrijven die niet meetellen | 3 | identiteit | afgeleid (voorstel kennistest), verklaard na gesprek | intern | kennistest (`llm-baseline.ts`, alleen als leeg), formulier | meting (`measure.ts`), kennistest, reputatie | meenemen (stuurveld) |
| `industry` | Branche | 3 | identiteit | afgeleid of verklaard | intern | merkonderzoek, formulier | onderzoeksopdrachten, meetvragen, clusters ontdekken, offsite | meenemen |
| `business_model` | Retailer, dienstverlener, fabrikant, platform | 3 | identiteit | afgeleid of verklaard | intern | merkonderzoek, aanbodboom (als leeg), formulier | aanbodboom, onderzoek, schrijver (`schrijven.ts`), gestructureerde gegevens | meenemen |
| `summary` | Korte omschrijving van het bedrijf | 3 | identiteit | afgeleid | intern | merkonderzoek, formulier | meetvragen (`prompts.ts`), schermen | meenemen |
| `intake_description` | Omschrijving die de consultant bij het aanmaken typte | 0 | identiteit | verklaard | intern | aanmaken, formulier | merkonderzoek, als aanname (`intake-block.ts`) | meenemen |
| `market_language` | Markt en taal | 3 | identiteit | afgeleid of verklaard | intern | merkonderzoek, formulier | meetvragen, merkonderzoek | meenemen (stuurveld) |
| `service_scope` | Bereik: lokaal, landelijk, internationaal | 3 | identiteit | afgeleid of verklaard | intern | merkonderzoek, formulier | meetvragen, volledigheid, onderzoek bijwerken | meenemen (stuurveld) |
| `service_regions` | Werkgebied, plaatsen | 3 | identiteit | afgeleid of verklaard | content | merkonderzoek, formulier | schrijver, meetvragen, kennistest, markt, 34 bestanden | meenemen (stuurveld) |
| `wikidata_id` | Entiteit op Wikidata | 0 | identiteit | waargenomen (extern) | intern | offsite-scan | technische audit | meenemen |
| `wikipedia_url` | Pagina op Wikipedia | 0 | identiteit | waargenomen (extern) | intern | offsite-scan | technische audit | meenemen |
| `author_name` | Auteur van de content | 0 | identiteit | | | formulier | alleen het formulier | niet meer gebruiken |
| `author_role` | Functie van de auteur | 0 | identiteit | | | formulier | alleen het formulier | niet meer gebruiken |
| `author_bio` | Korte biografie | 0 | identiteit | | | formulier | alleen het formulier | niet meer gebruiken |
| `author_photo_url` | Foto van de auteur | 0 | identiteit | | | formulier | alleen het formulier | niet meer gebruiken |
| `author_linkedin_url` | LinkedIn van de auteur | 0 | identiteit | | | formulier | alleen het formulier | niet meer gebruiken |
| `author_facebook_url` | Facebook van de auteur | 0 | identiteit | | | formulier | alleen het formulier | niet meer gebruiken |
| `author_other_url` | Andere link van de auteur | 0 | identiteit | | | formulier | alleen het formulier | niet meer gebruiken |

**Aanbod en commerciële sturing**

| Kolom | Wat het is | Gevuld | Domein | Status | Gebruik | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|---|---|
| `products` | Platte lijst van producten en diensten | 3 | aanbod | afgeleid (unie van model en mens) | intern | merkonderzoek, formulier | meetvragen, meting (eigen producten), crawl, voorraadkwaliteit | meenemen, alleen de namen die nog geen knoop in `profile_offerings` zijn (ontdubbelen in code) |
| `priority_offerings` | Aanbod waarop de klant wil groeien | 3 | aanbod | verklaard (gesprek) | intern | formulier, gesprek | onderwerpen, rapport, reputatie | meenemen |
| `deprioritised_offerings` | Aanbod waar de klant minder van wil | 3 | aanbod | verklaard (gesprek) | intern | formulier, gesprek | onderwerpen, rapport, reputatie | meenemen |
| `deal_value_band` | Wat een klant waard is | 3 | aanbod | verklaard (gesprek) | intern | formulier, gesprek | geen (volgens `onboarding-refresh.ts` "nog geen lezer") | meenemen (nodig voor N1, commerciële waarde) |
| `seasonality` | Pieken en dalen in het jaar | 3 | aanbod | verklaard (gesprek) | intern | formulier, gesprek | rapport (`commercial-context.ts`) | meenemen |
| `goal_12m` | Waar de klant over een jaar wil staan | 3 | positionering | verklaard (gesprek) | intern | formulier, gesprek | onderwerpen, rapport | meenemen |
| `growth_regions` | Plaatsen waar de klant wil groeien | 3 | identiteit | verklaard (gesprek) | intern | formulier, gesprek | meetvragen, rapport, vraagdekking | meenemen |

**Doelgroep**

| Kolom | Wat het is | Gevuld | Domein | Status | Gebruik | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|---|---|
| `personas` | Klantgroepen met omschrijving | 3 | doelgroep | afgeleid | intern | merkonderzoek (als leeg), formulier | alleen het formulier | meenemen (als afgeleid; bruikbaar voor het kennisgat, N6) |
| `intake_audience` | Doelgroep die de consultant bij het aanmaken typte | 0 | doelgroep | verklaard | intern | aanmaken, formulier | merkonderzoek, als aanname | meenemen |
| `target_segments` | Klantgroepen waar de klant op wil groeien | 3 | doelgroep | verklaard (gesprek) | intern | formulier, gesprek | onderwerpen, rapport | meenemen |
| `sales_objections` | Bezwaren van kopers, met het antwoord van de ondernemer | 3 | doelgroep | verklaard (gesprek) | content | formulier, gesprek | schrijver (blok A), meetvragen | meenemen |
| `audience_secondary` | Tweede doelgroep | 0 | doelgroep | | | formulier | alleen het formulier | niet meer gebruiken |
| `audience_knowledge_level` | Kennisniveau van de doelgroep, 1 tot 3 | 0 | doelgroep | | | geen (niet bewerkbaar sinds besluit B14) | geen | niet meer gebruiken |
| `customer_questions` | Vragen van klanten | 0 | doelgroep | | | geen | geen, staat nergens in de code | niet meer gebruiken |

**Positionering en bewijs**

| Kolom | Wat het is | Gevuld | Domein | Status | Gebruik | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|---|---|
| `competitors` | Concurrenten | 3 | positionering | afgeleid (merkonderzoek, markt) of verklaard | intern | merkonderzoek, markt (`market.ts`), formulier | meetvragen, onderwerponderzoek, markt, kennistest, reputatie, schrijver (namen weglakken) | meenemen (stuurveld) |
| `value_props` | Waardeproposities | 3 | positionering | afgeleid (geen citaat) | nu content, straks intern | merkonderzoek (geschoond), formulier | **schrijver (blok A)** | meenemen als afgeleid; gaat in K6 uit blok A (§3 punt 5) |
| `differentiator` | Wat het bedrijf anders doet | 0 | positionering | verklaard (gesprek) | content | formulier, gesprek | schrijver (blok A) | meenemen |
| `brand_mission` | Missie | 0 | positionering | | | formulier | alleen het formulier | niet meer gebruiken |
| `brand_positioning` | Positionering | 0 | positionering | | | formulier | alleen het formulier | niet meer gebruiken |
| `usp` | Unieke verkoopbelofte | 0 | positionering | | | formulier | alleen het formulier | niet meer gebruiken |
| `key_messages` | Kernboodschappen | 0 | positionering | | | geen (niet bewerkbaar sinds B14) | geen | niet meer gebruiken |
| `identity_keywords` | Woorden die bij het merk horen | 0 | positionering | | | geen (niet bewerkbaar sinds B14) | geen | niet meer gebruiken |
| `offline_proof` | Bewijs dat niet op de site staat | 3 | bewijs | verklaard (gesprek) | content | formulier, gesprek | schrijver (blok A), rapport, vraagdekking | meenemen |
| `proof_points` | Bewijspunten | 3 (27 regels) | bewijs | gemengd: 12 afgeleid, 15 kopie van een antwoord | geen | merkonderzoek (vervangt de lijst), `answerFact()` (voegt toe) | geen pijplijnstap; alleen volledigheidsmeter en gespreksscherm | niet meer gebruiken; K3 neemt de 12 onderzoeksregels mee als afgeleid (bewijs, intern) en slaat de 15 kopieën over, want die komen uit `fact_requests` (§3 punt 4) |

**Stem, verhaal en grenzen**

| Kolom | Wat het is | Gevuld | Domein | Status | Gebruik | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|---|---|
| `verhalen` | Klussen, werkwijze en bezwaren in de woorden van de ondernemer | 3 (799 tot 870 tekens) | verhaal | verklaard (gesprek) | content | formulier, gesprek | schrijver (blok A) | meenemen, letterlijk als één item |
| `stem_voorbeelden` | Eén tot drie pagina's met de stem van het bedrijf, met opgehaalde tekst | 3 (2 per merk) | stem | waargenomen (tekst letterlijk van het adres) | content, als voorbeeld van toon | formulier, `stemvoorbeelden.ts` | schrijver, controle | meenemen |
| `pronoun_preference` | Je, u of wij | 3 | stem | verklaard (gesprek) | content | formulier, gesprek | schrijver | meenemen |
| `tone_of_voice` | Toon in vrije tekst | 3 | stem | afgeleid | geen | merkonderzoek, aanmaken | merkonderzoek als eigen aanname; gaat naar de meetvragen maar staat niet in de opdracht (`prompts.ts`) | niet meer gebruiken (vervangen door de stemvoorbeelden, B14) |
| `style_samples` | Voorbeeldzinnen van de site | 3 | stem | afgeleid (zonder bronadres) | geen | merkonderzoek | geen | niet meer gebruiken |
| `signature_phrases` | Vaste uitdrukkingen | 0 | stem | | | geen (niet bewerkbaar sinds B14) | geen | niet meer gebruiken |
| `tone_formality` | Stemschuif formeel | 0 | stem | | | geen (niet bewerkbaar sinds B14) | geen | niet meer gebruiken |
| `tone_energy` | Stemschuif energie | 0 | stem | | | geen | geen | niet meer gebruiken |
| `tone_complexity` | Stemschuif complexiteit | 0 | stem | | | geen | geen | niet meer gebruiken |
| `tone_humor` | Stemschuif humor | 0 | stem | | | geen | geen | niet meer gebruiken |
| `tone_emotional` | Stemschuif emotie | 0 | stem | | | geen | geen | niet meer gebruiken |
| `taboo_phrases` | Woorden die het merk niet wil | 3 | grens | verklaard (gesprek) | verboden | formulier, gesprek | schrijver, controle in code (`controle-regels.ts`) | meenemen |
| `forbidden_topics` | Onderwerpen die het merk niet wil | 3 | grens | verklaard (gesprek) | verboden | formulier, gesprek | schrijver, rapport, onderwerpen | meenemen |
| `respect_site_structure` | Mag het advies de opbouw van de site veranderen | 3 | grens | verklaard (gesprek) | intern | formulier, gesprek | rapport | meenemen |
| `compliance_notes` | Wettelijke beperkingen | 0 | grens | | | formulier | alleen het formulier | niet meer gebruiken (in K7 kan de consultant zo'n regel als grens vastleggen) |

**Geen klantkennis: techniek, koppelingen en boekhouding**

| Kolom | Wat het is | Gevuld | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|
| `status` | Stand van het merkonderzoek | 3 | onderzoek | schermen, taken | geen klantkennis |
| `edited_by_user` | Heeft een mens iets aangepast | 3 | formulier | schermen van analyses | geen klantkennis |
| `created_at`, `updated_at` | Tijdstempels (twee kolommen) | 3 | database | schermen | geen klantkennis |
| `created_by_user_id` | Wie het merk aanmaakte | 0 | uitnodigingen | geen | geen klantkennis |
| `assigned_at` | Wanneer het merk aan een klant is gekoppeld | 3 | toewijzen | fase van het merk, CSM | geen klantkennis |
| `archived_at` | Gearchiveerd | 0 | archiveren | werker, schermen | geen klantkennis |
| `onboarding_budget_usd` | Kostenplafond onderzoek | 3 | aanmaken | onderzoeksstappen | geen klantkennis |
| `deep_research_at` | Wanneer het merkonderzoek draaide | 3 | merkonderzoek | schermen | geen klantkennis |
| `engines_enabled` | Welke AI-bronnen aanstaan | 3 | instellingen | kennistest, meting | geen klantkennis |
| `raw_json` | Ruwe uitvoer van het merkonderzoek | 3 | merkonderzoek | schermen | alleen herkomst (`ruw` van de items die K3 uit het merkonderzoek haalt) |
| `inventory_quality_json` | Kwaliteit van de pagina-inventaris | 3 | site uitlezen (`discover.ts`) | aanbodboomscherm | geen klantkennis |
| `max_inventory_pages` | Plafond voor de crawl | 3 | formulier | crawler | geen klantkennis |
| `sitemap_url` | Adres van de sitemap | 0 | formulier | crawler | geen klantkennis |
| `sitemap_total_urls` | Aantal adressen in de sitemap | 3 | site uitlezen | formulier | geen klantkennis |
| `crawl_priority_paths` | Secties die voorrang krijgen | 0 | site uitlezen, formulier | crawler, aanbodboom | geen klantkennis |
| `crawl_speed` | Snelheid van de crawl | 3 | instellingen | crawler | geen klantkennis |
| `crawl_as_browser` | Crawlen als browser | 3 | instellingen | crawler | geen klantkennis |
| `crawl_last_run_at` | Laatste crawl | 1 | crawler | formulier | geen klantkennis |
| `crawl_last_mode` | Soort laatste crawl | 1 | crawler | formulier | geen klantkennis |
| `crawl_last_blocked_at` | Laatste blokkade | 0 | crawler | formulier | geen klantkennis |
| `crawl_lightly_scanned` | Licht gelezen pagina's | 1 | crawler | formulier | geen klantkennis |
| `gsc_property` | Search Console-eigendom | 0 | koppeling | zoekverkeer, cron | geen klantkennis |
| `gsc_verified_at` | Koppeling gecontroleerd | 0 | koppeling | zoekverkeer | geen klantkennis |
| `gsc_last_error` | Laatste fout | 0 | koppeling | zoekverkeer | geen klantkennis |
| `gsc_last_sync_at` | Laatste ophaalronde | 0 | koppeling | gespreksscherm | geen klantkennis |
| `gsc_first_day` | Eerste dag met gegevens | 0 | koppeling | opbrengstblok | geen klantkennis |
| `entity_checked_at` | Wanneer de entiteit is nagekeken | 3 | offsite-scan | offsite-scan | geen klantkennis |
| `contact_name` | Contactpersoon | 0 | formulier, gesprek | alleen het formulier | geen klantkennis (een afspraak, geen kennis voor content) |
| `contact_email` | E-mail contactpersoon | 0 | formulier, gesprek | alleen het formulier | geen klantkennis |
| `contact_phone` | Telefoon contactpersoon | 0 | formulier, gesprek | alleen het formulier | geen klantkennis |

`created_at` en `updated_at` staan op één regel; samen met de andere regels zijn dat 94 kolommen.

### 4.2 `brand_facts` (22 kolommen, 33 rijen)

Alle 33 rijen komen uit de samenvatting van het onderzoek: `kind = site`, `stand = site`, geen enkele
verwijzing naar een vraag of document. Soort en waarde zijn ingedeeld door een model (`fact-classify.ts`,
via `feitenregister.ts`).

| Kolom | Wat het is | Gevuld | Wordt in `klantkennis` | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|
| `id` | Sleutel | 33 | `herkomst_id` | samenvatting | conflicten, schrijver | alleen herkomst |
| `profile_id` | Het merk | 33 | `profile_id` | samenvatting | overal | geen klantkennis (sleutel) |
| `analysis_id` | Cluster waar het feit bij hoort | 0 | `geldt_voor` (cluster) | samenvatting (altijd leeg) | schrijver (filter) | alleen herkomst |
| `text` | De bewering | 33 | `bewering` | samenvatting | schrijver (blok A), conflicten | meenemen |
| `source` | Bron als tekst, bijvoorbeeld "site /contact" | 33 | `bron` | samenvatting | feitenregister, conflictscherm | alleen herkomst |
| `source_url` | Bronpagina | 33 | `bron_url` | samenvatting | geen | alleen herkomst |
| `kind` | site, klant of onderzoek | 33 (alle site) | bepaalt `status` en `bron` | samenvatting | feitenregister | alleen herkomst |
| `citable` | Mag geciteerd worden | 33 (alle waar) | niets | samenvatting | geen | niet meer gebruiken |
| `allowed` | Mag gebruikt worden | 33 | `gebruik` (onwaar wordt intern) | samenvatting | schrijver (filter) | meenemen |
| `fact_key` | Ontdubbelsleutel (`claimKey()`) | 33 | ontdubbelsleutel van K2 | samenvatting | conflicten, `answerFact()` | alleen herkomst |
| `verify_after` | Datum om opnieuw te controleren | 0 | niets (`verloopt_op` komt ervoor in de plaats) | geen | geen | niet meer gebruiken |
| `origin_fact_request_id` | Vraag waar het feit uit kwam | 0 | niets (`herkomst_id` komt ervoor in de plaats) | geen | geen | niet meer gebruiken |
| `origin_document_id` | Document waar het feit uit kwam | 0 | niets | geen | geen | niet meer gebruiken |
| `superseded_by` | Vervangen door | 0 | `vervangen_door` | `answerFact()`, feitenregister | schrijver (filter), conflicten | meenemen |
| `created_at` | Aangemaakt | 33 | vastgelegd op | database | feitenregister | alleen herkomst |
| `updated_at` | Gewijzigd | 33 | | database | geen | geen klantkennis |
| `soort` | prijs, termijn, werkgebied, dienst, enzovoort | 33 | `soort` | indeling door een model | feitenregister, conflicten | meenemen |
| `waarde` | Genormaliseerde waarde | 8 | `waarde` | indeling door een model | conflicten | meenemen |
| `geldt_voor` | Dienst of regio als tekst | 24 | `geldt_voor` (in K3 omzetten naar verwijzingen) | indeling door een model | schrijver (filter per pagina) | meenemen |
| `stand` | site, klant, bevestigd, betwist, vervangen | 33 (alle site) | `status` | feitenregister | schrijver (filter), conflicten | meenemen |
| `bewijskracht` | sterk, gewoon, geen | 33 | een veld naast de status | indeling door een model | schrijver (volgorde), conflicten | meenemen |
| `ingedeeld_at` | Wanneer ingedeeld | 33 | | feitenregister | feitenregister, feitenscherm | alleen herkomst |

**Status bij terugvullen:** *waargenomen*, met het citaat uit `profile_facets` (facet `synthese`,
`raw_json.output_parsed.facts`, gekoppeld op de tekst van het feit; alle 33 gevonden). Een feit met
`stand = bevestigd` wordt *bevestigd*, `betwist` blijft betwist (een conflict in `fact_conflicts`),
`vervangen` gaat mee met `vervangen_door`.

### 4.3 `profile_offerings` (19 kolommen, 85 knopen)

64 diensten, 18 categorieën, 3 vestigingen; alle 85 door het model (`source = ai`), alle 85 met een
bronpagina en een gecontroleerd citaat.

| Kolom | Wat het is | Gevuld | Domein | Status | Gebruik | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|---|---|
| `id` | Sleutel van de knoop | 85 | | | | aanbodboom | onderwerpen, clusters, reputatie | alleen herkomst (`herkomst_id`, en het doel van `geldt_voor`) |
| `profile_id` | Het merk | 85 | | | | aanbodboom | overal | geen klantkennis (sleutel) |
| `parent_id` | Bovenliggende knoop | 63 | aanbod | waargenomen | intern | aanbodboom, bewerken | onderwerpen, clusters, structuurgat | meenemen (als `geldt_voor` naar de ouder) |
| `kind` | dienst, product, categorie, vestiging | 85 | aanbod (vestiging: identiteit) | waargenomen | intern | aanbodboom, bewerken | onderwerpen, markt, reputatie | meenemen (als `soort`) |
| `name` | Naam van de dienst | 85 | aanbod | waargenomen | content | aanbodboom, bewerken | onderwerpen, rapport, clusters, markt | meenemen |
| `description` | Omschrijving | 75 | aanbod | waargenomen | content | aanbodboom, bewerken | onderwerpen, editor | meenemen |
| `audience` | Doelgroep van deze dienst | 10 | doelgroep | waargenomen | content | aanbodboom, bewerken | onderwerpen | meenemen (met `geldt_voor` naar de dienst) |
| `price_indication` | Prijsindicatie | 13 | aanbod | waargenomen | content | aanbodboom, bewerken | onderwerpen, editor | meenemen (soort prijs, met `verloopt_op`) |
| `evidence_url` | Bronpagina | 85 | | | | aanbodboom | admin, editor | alleen herkomst (`bron_url`) |
| `evidence_quote` | Letterlijk citaat | 85 | | | | aanbodboom | admin | alleen herkomst (`citaat`) |
| `confidence` | Zelfoordeel van het model | 85 | | | | aanbodboom | geen | niet meer gebruiken |
| `source` | ai, klant, consultant | 85 (alle ai) | | | | aanbodboom, bewerken | editor | alleen herkomst (`bron`; bepaalt de status, §3 punt 9) |
| `sort_order` | Volgorde op het scherm | 85 | | | | aanbodboom | editor | geen klantkennis |
| `created_at`, `updated_at` | Tijdstempels (twee kolommen) | 85 | | | | database | editor | geen klantkennis |
| `note` | Notitie van de consultant | 0 | aanbod | verklaard | intern | bewerken | editor | meenemen |
| `removed_at` | Weggehaald | 0 | | | | bewerken | onderwerpen, clusters | meenemen (als "vervallen": het item blijft, met `vervangen_door` of gebruik intern) |
| `removed_by` | Wie hem weghaalde | 0 | | | | bewerken | geen | alleen herkomst |
| `updated_by` | Wie hem wijzigde | 0 | | | | bewerken | geen | alleen herkomst (`vastgelegd_door`) |

### 4.4 `profile_facets` (11 kolommen, 18 rijen: 6 facetten per merk)

Een facet is het verslag van één onderzoeksstap. **Het verslag zelf is geen klantkennis** en blijft
staan als ruwe uitvoer (conventie 8). Wel zitten er in drie facetten stukken kennis die K3 eruit moet
halen:

| Facet | Stap | Wat erin staat | Wat ermee moet |
|---|---|---|---|
| `synthese` | Alles samenbrengen (`synthesis.ts`) | Het dossier voor het gesprek, open punten (`gaps`, 6 tot 9 per merk), de feiten met citaat, afgewezen feiten | Citaten naar de feiten uit `brand_facts` (§4.2). Open punten worden kennisgaten (A3) |
| `aanbod` | Aanbodboom (`offering.ts`) | Open punten over het aanbod (`gaps`, 4 tot 5 per merk) | Kennisgaten (A3) |
| `markt` | Markt (`market.ts`) | Concurrenten met reden en bron, gezaghebbende domeinen, een positionering in één alinea | Positionering en concurrenten als *afgeleid*, intern |
| `techniek` | Site uitlezen (`discover.ts`) | Telefoon, e-mail, adres, KvK, namen uit de HTML en gestructureerde gegevens | Identiteit als *waargenomen* (letterlijk uit de HTML), intern |
| `llm_kennis` | Kennistest (`llm-baseline.ts`) | Wat AI-assistenten over het merk weten | Geen klantkennis: dit is een meting |
| `sjabloon` | Site uitlezen | CMS, kopniveaus, FAQ-blok | Geen klantkennis: techniek van de site |

| Kolom | Wat het is | Gevuld | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|
| `id` | Sleutel | 18 | onderzoeksstappen | geen | alleen herkomst (`herkomst_id` van wat K3 eruit haalt) |
| `profile_id` | Het merk | 18 | onderzoeksstappen | overal | geen klantkennis (sleutel) |
| `facet` | Welke stap | 18 | onderzoeksstappen | samenvatting, markt, schermen | alleen herkomst (`bron`, samen met `engine`) |
| `summary` | Samenvatting van het verslag | 18 | onderzoeksstappen | adminscherm | geen klantkennis |
| `raw_json` | Ruwe uitvoer | 18 | onderzoeksstappen | samenvatting, markt, organisatie, bibliotheek, 0-meting | alleen herkomst (`ruw` en `citaat`) |
| `confidence` | Zelfoordeel van het model | 17 | onderzoeksstappen | aanbodboomscherm | niet meer gebruiken |
| `sources` | Bronnen die de stap vond | 7 | onderzoeksstappen | adminscherm | alleen herkomst |
| `model_used` | Model | 9 | onderzoeksstappen | adminscherm | geen klantkennis |
| `engine` | Soort stap | 18 | onderzoeksstappen | adminscherm | geen klantkennis |
| `cost_usd` | Kosten | 18 | onderzoeksstappen | adminscherm | geen klantkennis |
| `researched_at` | Wanneer | 18 | onderzoeksstappen | adminscherm | alleen herkomst (vastgelegd op) |

### 4.5 `profile_strategy` (6 kolommen, 3 rijen)

| Kolom | Wat het is | Gevuld | Domein | Status | Gebruik | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|---|---|
| `profile_id` | Het merk | 3 | | | | gesprek (`strategy/route.ts`) | overal | geen klantkennis (sleutel) |
| `strategy_notes` | Aantekeningen van het gesprek | 3 | positionering (gemengd) | verklaard | intern | gesprek vastleggen | onderwerpen, meer onderwerpen, clusters ontdekken | meenemen, letterlijk als één item (niet in code te splitsen; §4 regel 1) |
| `context_factors` | Veranderingen die niet op de site staan | 0 (3 lege lijsten) | identiteit en aanbod | verklaard | intern | gesprek vastleggen | rapport, onderwerpen, clusters ontdekken | meenemen (elk element een item) |
| `recorded_by` | Wie het gesprek vastlegde | 3 | | | | gesprek vastleggen | geen | alleen herkomst (`vastgelegd_door`) |
| `recorded_at` | Wanneer | 3 | | | | gesprek vastleggen | fase van het merk, CSM, onderwerpen | geen klantkennis (blijft het signaal "gesprek gehad") |
| `updated_at` | Gewijzigd | 3 | | | | gesprek vastleggen | geen | geen klantkennis |

### 4.6 `fact_requests` (23 kolommen, 64 vragen, 47 beantwoord)

Een vraag is geen kennis; **het antwoord wel.** De tabel blijft het vraagobject (A1 tot A3 bouwen
erop), en elk beantwoord antwoord wordt in K3 een item met status *verklaard* en `herkomst_id` naar de
vraag. Van de 47 antwoorden zijn er 11 een antwoord op de open vraag van een pagina (`open_vraag`); die
worden een verhaal voor die ene pagina (besluit B3).

| Kolom | Wat het is | Gevuld | Wordt in `klantkennis` | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|
| `id` | Sleutel | 64 | `herkomst_id` | brief, rapport, samenvatting, document | overal | alleen herkomst |
| `profile_id` | Het merk | 64 | | idem | overal | geen klantkennis (sleutel) |
| `analysis_id` | Cluster | 39 | `geldt_voor` (cluster) | brief, rapport | schrijver (blok A), vragenscherm | alleen herkomst |
| `question` | De vraag | 64 | samen met het antwoord de `bewering` | idem | schrijver, vragenscherm | meenemen |
| `answer` | Het antwoord | 48 | `bewering`, status verklaard | `answerFact()`, document | schrijver (blok A en B) | meenemen |
| `reason` | Waarom we het vragen | 64 | | idem | vragenscherm | geen klantkennis (vraagobject) |
| `status` | open, beantwoord, verlopen | 64 | alleen beantwoord gaat mee | idem, `answerFact()` | overal | geen klantkennis (vraagobject) |
| `answered_at` | Wanneer beantwoord | 47 | vastgelegd op | `answerFact()` | document, feitenkaart | alleen herkomst |
| `scope` | merk, analyse, pagina | 64 | `geldt_voor` (leeg, cluster of pagina) | idem | schrijver (blok A), vragenscherm | alleen herkomst |
| `content_piece_ids` | Pagina's waar de vraag bij hoort | 47 | `geldt_voor` (pagina) | brief, `taken.ts` | schrijver, vragenscherm | alleen herkomst |
| `kind` | aanvulling, praktisch | 64 | | idem | vragenscherm | geen klantkennis (vraagobject) |
| `answer_type` | tekst, getal, keuze | 64 | | idem | vragenlijst | geen klantkennis (vraagobject) |
| `options` | Keuzes | 0 | | brief | vragenlijst | geen klantkennis (vraagobject) |
| `suggested_answer` | Voorgesteld antwoord | 0 | | samenvatting en document, altijd leeg | vragenlijst | niet meer gebruiken |
| `required` | Verplicht | 64 | | idem | vragenlijst | geen klantkennis (vraagobject) |
| `claim_key` | Ontdubbelsleutel van een documentfeit | 0 | ontdubbelsleutel | document | `answerFact()`, vraag sluiten | alleen herkomst |
| `fact_ref` | Verwijzing naar een feit | 0 | | geen | geen, staat nergens in de code | niet meer gebruiken |
| `verify_after` | Opnieuw controleren na | 0 | `verloopt_op` | document | document | meenemen |
| `raw_json` | Waar de vraag vandaan kwam | 41 | `ruw` | brief, samenvatting | `answerFact()` (open punt of niet) | alleen herkomst |
| `section_id` | Sectie van een oude brief | 0 | | geen | alleen weggefilterd (`fact-request-public.ts`) | niet meer gebruiken |
| `section_refs` | Secties van een oude brief | 0 | | geen | alleen weggefilterd | niet meer gebruiken |
| `open_vraag` | De open vraag van een pagina | 64 (11 waar) | domein verhaal, `geldt_voor` die pagina | open vraag (`open-vraag.ts`) | schrijver (blok B), vragenscherm | meenemen |
| `created_at` | Aangemaakt | 64 | | database | vragenscherm | geen klantkennis |

### 4.7 `brand_documents` (9 kolommen, 0 rijen)

Er is op productie nog geen document geplakt. De feiten die een document oplevert, gaan als
beantwoorde merkvraag naar `fact_requests` (§3 punt 3), en krijgen daarmee in K3 de status
*verklaard*. K4 of K5 kan ze beter *waargenomen* maken, met het document als bron en de zin als citaat.

| Kolom | Wat het is | Wordt in `klantkennis` | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|
| `id` | Sleutel | `herkomst_id` | document plakken | geen | alleen herkomst |
| `profile_id` | Het merk | | idem | idem | geen klantkennis (sleutel) |
| `label` | Naam van het document | `bron` | idem | geen | alleen herkomst |
| `body` | De geplakte tekst | `ruw`, bron van het citaat | idem | geen | alleen herkomst |
| `content_hash` | Ontdubbeling van hetzelfde document | | idem | document plakken | geen klantkennis |
| `chars` | Lengte | | idem | geen | geen klantkennis |
| `facts_extracted` | Aantal feiten | | idem | geen | geen klantkennis |
| `facts_rejected` | Aantal afgewezen feiten | | idem | geen | geen klantkennis |
| `created_at` | Aangemaakt | vastgelegd op | database | geen | alleen herkomst |

### 4.8 `profile_field_sources` (9 kolommen, 54 rijen)

Wie welk veld van `profiles` zette. Op productie: 45 keer het gesprek, 6 keer de consultant, 3 keer de
klant, verdeeld over 18 velden. **Dit is de herkomst van alle kolommen van §4.1 die "verklaard"
heten**, en K3 leest hem om de status per item te bepalen (bron gesprek of klant wordt verklaard,
consultant wordt verklaard met de consultant als `vastgelegd_door`, ai of geen rij wordt afgeleid).

| Kolom | Wat het is | Gevuld | Wordt in `klantkennis` | Schrijft | Leest | Voorstel |
|---|---|---|---|---|---|---|
| `profile_id` | Het merk | 54 | | formulier, gesprek, kennistest | overal | geen klantkennis (sleutel) |
| `field` | Welke kolom van `profiles` | 54 | koppelt de herkomst aan het item | idem | schermen, onderzoek (mens wint) | alleen herkomst |
| `source` | ai, klant, gesprek, consultant | 54 | `bron` en `status` | idem | idem | alleen herkomst |
| `confidence` | Zekerheid | 54 | | idem | schermen | geen klantkennis |
| `evidence_url` | Bronpagina | 0 | | geen | geen | niet meer gebruiken |
| `evidence_quote` | Citaat | 0 | | geen | geen | niet meer gebruiken |
| `set_by` | Wie | 54 | `vastgelegd_door` | idem | geen | alleen herkomst |
| `set_at` | Wanneer | 54 | vastgelegd op | idem | onderzoek bijwerken, schermen | alleen herkomst |
| `not_applicable` | "Niet van toepassing" gekozen | 54 | | idem | gespreksscherm, open vragen | geen klantkennis (een antwoord op de volledigheidsmeter, geen kennis) |

---

## 5. Wat K1 en K3 hieruit meenemen

- **Het datamodel (K1)** heeft alles wat §6.1 noemt; deze inventaris vond geen veld dat erbij moet.
  Eén aanvulling op de soorten: `bewijskracht` (sterk, gewoon, geen) wordt nu gelezen door de schrijver
  voor de volgorde, en heeft in §6.1 nog geen plek. Voorstel voor K1: een eigen veld naast `status`.
- **Terugvullen (K3)**, per bron, zonder AI-aanroep:
  - `brand_facts` naar het domein uit `soort`, status *waargenomen* met het citaat uit de ruwe
    samenvatting;
  - `profile_offerings` naar aanbod (vestiging naar identiteit), *waargenomen* met hun eigen citaat;
  - de kolommen van `profiles` met "meenemen", met de status uit `profile_field_sources`;
  - beantwoorde `fact_requests` naar *verklaard*, met `geldt_voor` uit scope, cluster en pagina;
  - uit `profile_facets`: positionering en concurrenten uit `markt` als *afgeleid*, contactgegevens uit
    `techniek` als *waargenomen*;
  - `proof_points`: alleen de regels die niet met een vraagtekst beginnen, als *afgeleid*.
- **Wat de code niet kan indelen** (volgens §4 regel 1 van het plan) komt op een lijst voor de
  consultant: `strategy_notes` en `verhalen` gaan als één geheel mee, niet in stukken geknipt.

---

## 6. Besluiten van de eigenaar (26 september 2026)

1. **§2 van het plan is gecorrigeerd.** De zin over de herkomst van feiten zegt nu dat de kolommen voor
   vraag, document en herbevestiging bestaan maar nooit gevuld worden, en dat alle 33 feiten van de site
   komen (§3 punt 1 hierboven).
2. **De stuurvelden: kennislaag met kopie** (besluit V9 in §3.2 van het plan). `brand_name`,
   `aliases`, `name_exclusions`, `service_scope`, `service_regions`, `competitors` en
   `market_language` worden alleen via `lib/kennis/` geschreven. Die houdt de kolommen op `profiles`
   bij als kopie, en de meting blijft de kopie lezen. K8 laat een test falen als iets anders dan
   `lib/kennis/` deze kolommen nog schrijft.
3. **De twaalf lege velden verdwijnen van het formulier** als K7 de kennisvelden vervangt (besluit V10).
   De kolommen blijven in de database staan; er wordt niets gewist. Een wettelijke beperking wordt een
   item in het domein grens.
