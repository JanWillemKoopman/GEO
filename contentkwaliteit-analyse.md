# Contentkwaliteit — Doorlichting & doorgevoerde verbeteringen

> **Uitgangsvraag:** *"Hoe kunnen we de kwaliteit van de door AI geschreven content kwalitatief beter maken?"*
>
> Dit document loopt de contentpijplijn van de app na (crawl → Brand DNA → prompts → meting → rapport → **content-generatie**), benoemt de zwakke plekken, en geeft een **geprioriteerde verbeterlijst** met per punt de **impact** en de **extra API-kosten**. Onderaan staat wat er **daadwerkelijk in de code is doorgevoerd** en wat als vervolgstap openstaat.
>
> *Opgesteld juli 2026. Verwijzingen: `abcplan.md` (spec) en de bestanden onder `lib/`.*
>
> **Status:** dit was de doorlichting die tot de eerste redactie-lus in Fase C leidde
> (§3 hieronder). Een groot deel van wat in §4 destijds nog openstond, is inmiddels
> alsnog gebouwd — zie de bijgewerkte §4 en [`optimalisatie.md`](./optimalisatie.md)
> fase 4 voor de actuele stand van de content-pijplijn.

---

## 0. Kernconclusie

De meet-/adviespijplijn is degelijk. Het dunste onderdeel was de **content-generatie (Fase C)** — juist het betaalde product. In de oorspronkelijke opzet schreef die "blind": **één call, één klein model (`gpt-4.1-mini`), geen redactie, geen kwaliteitspoort, en — door de terechte regel "verzin geen feiten" — gedwongen generiek.** Dat is het recept voor content die AI-assistenten niet citeren.

De sleutel-inzichten:

1. **Grounding lost de generiek-val op.** De regel "verzin geen feiten" maakt content generiek zolang de schrijver *geen* feiten heeft. Geef hem **geverifieerde feiten uit de eigen site** en hij kan concreet én veilig schrijven.
2. **Kwaliteit is bijna gratis.** Content is vraaggestuurd (op klik); een redactie-lus + premium model kost centen per pagina, terwijl content het kernproduct is waarvoor concurrenten €1.000+/mnd rekenen.
3. **Symmetrie in kwaliteitsborging.** De meting heeft een expliciete review-gate; de content — het echte product — verdient ook een kwaliteitspoort.

---

## 1. Zwakke plekken per halte (contentbril)

- **Brand DNA (halte 1):** typeert het merk, maar leverde geen **concrete feiten** of **stijlvoorbeelden** — dus de schrijver bleef generiek of moest tone-of-voice raden.
- **Prompts (halte 2):** goede categorie-dekking, maar geen **demand-grounding** (schrijven we voor vragen die mensen echt stellen?).
- **Meting → rapport:** de per-concurrent geciteerde bronnen worden bewaard maar **inhoudelijk niet gebruikt** als blauwdruk voor betere content.
- **Content-generatie (Fase C):** één blinde call, klein model, geen research, **geen redactie/kritiek-lus**, geen feit-/regelcontrole, `schema_jsonld` als onbetrouwbare LLM-string, alles direct `ready`.

---

## 2. Verbeterlijst (impact & extra API-kosten)

**Legenda:** 🔴 hoog · 🟠 middel · 🟡 polish. Kosten indicatief (nano $0,10/$0,40; mini $0,40/$1,60; `gpt-4.1` ~$2/$8 per 1M; `web_search` ~$0,01/call + 8k tokens). "Eigen crawl" = geen API-kosten.

### A — Input & grounding
| # | Verbeterpunt | Impact | Extra kosten |
|---|--------------|--------|--------------|
| A1 | Dieper (sitemap-gedreven) crawlen voor Brand DNA | 🔴 | ~$0 crawl; +tokens (~+$0,004) |
| A2 | `proofPoints` (citeerbare feiten uit de site) in Brand DNA | 🔴 | verwaarloosbaar |
| A3 | `styleSamples` (letterlijke stijlvoorbeelden) | 🟠 | verwaarloosbaar |
| A4 | Feiten bewerkbaar in de review-gate-UI | 🟠 | $0 |

### B — Targeting
| # | Verbeterpunt | Impact | Extra kosten |
|---|--------------|--------|--------------|
| B1 | Demand-grounding van prompts (web_search of keyword-API) | 🔴 | +$0,013/analyse of extern abo |
| B2 | Rijkere content-brief (vragen/concurrenten/feiten) uit het rapport | 🔴 | < +$0,001/pagina |
| B3 | Winnende concurrent-bronnen als "verslaan"-blauwdruk (eigen crawl) | 🔴 | ~$0 crawl; +tokens |
| B4 | Prioritering op waarde × demand × gap | 🟠 | verwaarloosbaar |

### C — De generatiestap
| # | Verbeterpunt | Impact | Extra kosten |
|---|--------------|--------|--------------|
| C1 | `web_search`-grounding/research in de generatie | 🔴 | +$0,013-0,03/pagina |
| C2 | Plan-dan-schrijf (outline → pagina) | 🟠 | +$0,003-0,01/pagina |
| C3 | Redactie-/kritiek-lus (rubric + herschrijven) | 🔴 | +$0,004-0,012/pagina |
| C4 | Sterker model voor het eindproduct (`gpt-4.1`) | 🔴 | +~1-3 cent/pagina |
| C5 | Type-specifieke structuur (article/faq/landing/comparison) | 🟠 | $0 |
| C6 | Uitgeschreven prompts met rubric + negatieve constraints | 🔴 | $0 |
| C7 | Regeneratie-met-instructie ("formeler/korter") | 🟠 | +$0,003-0,015/keer |

### D — Feitelijkheid & merk-veiligheid
| # | Verbeterpunt | Impact | Extra kosten |
|---|--------------|--------|--------------|
| D1 | Feitcontrole-pass (`web_search`) | 🔴 | +$0,013-0,03/pagina |
| D2 | Twijfel-vlag op onzekere feiten | 🟠 | $0 |
| D3 | Bronvermelding verplicht bij harde claims | 🟠 | $0 (bovenop C1/D1) |
| D4 | Anti-cliché / verboden-woordenlijst | 🟡 | $0 |

### E — GEO-techniek
| # | Verbeterpunt | Impact | Extra kosten |
|---|--------------|--------|--------------|
| E1 | Schema.org programmatisch valideren i.p.v. LLM-string | 🟠 | $0 |
| E2 | Interne links voorstellen uit de crawl | 🟠 | ~$0 |
| E3 | Answer-first afdwingen/valideren | 🟠 | $0 |
| E4 | Taal/locale afdwingen | 🔴 | $0 |

### F — Proces & kwaliteitsborging
| # | Verbeterpunt | Impact | Extra kosten |
|---|--------------|--------|--------------|
| F1 | Kwaliteitspoort (score → `needs_review`) vóór de bibliotheek | 🟠 | zit in C3 |
| F2 | Cluster-/bibliotheek-bewustzijn tegen overlap | 🟠 | < +$0,001/pagina |
| F3 | Mini-terugkoppeling: hermeet getargete prompts na generatie | 🟠 | +$0,02/pagina |
| F4 | Menselijke goedkeuring als kwaliteitsgarantie | 🟡 | $0 |

---

## 3. ✅ Doorgevoerd in de code (deze branch)

De volgende punten zijn **daadwerkelijk geïmplementeerd** in de gebouwde app, passend binnen main's vastgelegde regels (merkneutraal, geen verzonnen feiten, model-in-code, Nederlands):

| Punt | Wat | Bestand(en) |
|------|-----|-------------|
| **A2** | Brand DNA extraheert `proofPoints` (citeerbare feiten uit de site) | `lib/schemas/brand-dna.ts`, `lib/pipeline/brand-dna.ts`, migratie `0003` |
| **A3** | Brand DNA extraheert `styleSamples` (letterlijke stijlvoorbeelden) | idem |
| **Grounding** | De feiten + stijlvoorbeelden gaan als context mee de content-generatie in (feiten mogen WÉL gebruikt worden, rest niet verzinnen) | `lib/pipeline/content.ts` |
| **C3 + F1** | Redactie-/kritiek-lus: draft → rubric-score + regel-check → herschrijven indien nodig → herbeoordelen → `quality_score` + `needs_review` | `lib/pipeline/content.ts`, `lib/schemas/critique.ts`, migratie `0003` |
| **C4** | Premium model `gpt-4.1` voor draft/herschrijven; mini voor de redactie-stap | `lib/openai/models.ts`, `lib/pipeline/content.ts` |
| **C6** | Aangescherpte, expliciete schrijf- en redacteur-prompts met anti-cliché-constraint | `lib/pipeline/content.ts` |
| **E1** | `schema_jsonld` programmatisch gevalideerd/gerepareerd i.p.v. blind uit de LLM | `lib/schema-jsonld.ts`, `lib/pipeline/content.ts` |
| **F1 (UI)** | "Check nodig"-chip + kwaliteitsscore op de bibliotheek-kaarten | `app/analyses/[id]/bibliotheek/library-list.tsx` |
| **F4** | `needs_review`-vlag maakt menselijke controle expliciet | migratie `0003`, UI |

**Kosten na deze wijziging:** een pagina met redactie-lus draait ~$0,05 (draft `gpt-4.1` + 1-2× mini-kritiek + evt. 1× herschrijven `gpt-4.1`), tegen ~$0,003 voorheen — in absolute termen verwaarloosbaar voor het kernproduct.

## 4. Wat hierna is opgevolgd

Deze doorlichting was het startpunt van een grotere, later uitgevoerde herziening van
Fase C. Vrijwel alle toen nog openstaande punten zijn inmiddels wél gebouwd, in
[`optimalisatie.md`](./optimalisatie.md) fase 4 ("De schrijver krijgt de uitslagen") —
dat document is nu de actuele bron voor wat er in de content-pijplijn gebeurt:

- **B3 (winnende concurrent-bronnen als blauwdruk)** → gebouwd: `lib/pipeline/source-analysis.ts`
  haalt de door de AI geciteerde bronnen op en analyseert wat ze inhoudelijk doen — vooral
  wélk element ze *missen* is de waardevolle input voor de nieuwe pagina.
- **C1/D1 (web_search-grounding/feitcontrole in de generatie)** → gedeeltelijk gebouwd: bij
  minder dan drie geverifieerde feiten mag de schrijver zoeken naar *algemene* marktfeiten
  (nooit bedrijfsclaims), schakelbaar via `CONTENT_WEB_SEARCH`. Geen aparte feitcontrole-pass
  achteraf.
- **C7 (regeneratie-met-instructie)** → gebouwd: een vrij tekstveld "wat moet er anders?"
  gaat als zwaarste instructie de herschrijfstap in.
- **F3-achtig (terugkoppeling na publicatie)** → breder opgelost dan hier voorgesteld: in
  plaats van een korte post-generatie hermeting is er een volledige publiceer-verifiëer-
  hermeet-lus gekomen (`lib/pipeline/publish.ts`, `impact.ts`) — zie
  [`abcplan.md`](./abcplan.md) §8b.
- **A4 (feiten bewerkbaar maken)** → gedeeltelijk anders opgelost: in plaats van
  `proofPoints` direct bewerkbaar te maken, vraagt het rapport de klant gericht om
  ontbrekende cijfers/feiten wanneer een pagina er te weinig heeft; antwoorden landen in
  `proof_points` en verbeteren elke volgende pagina.

**Nog niet gebouwd:** A1 (sitemap-brede crawl specifiek vóór Brand DNA/profiel-research —
de contentinventaris-crawl uit `abcplan.md` §12-keuze 23 dekt dit deels anders), B1/B4
(demand-grounding en waarde-gebaseerde promptprioritering via een externe keyword-databron
— de volume-gewogen score uit §12-keuze 32 gebruikt LLM-inschatting, geen externe index),
een losstaande feitcontrole-pass (D1 boven op de C1-terugval), en F2 (bibliotheek-brede
overlapdetectie).
