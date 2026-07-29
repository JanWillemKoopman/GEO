# Marktonderzoek — GEO-tracking tools & InSpace/Nova (2026)

> Achtergrondonderzoek dat de productbeslissingen in [README.md](./README.md) onderbouwt:
> waarom "stupid simple" wint, en hoe ver een Nova-achtige (meet → schrijf → publiceer)
> dienst haalbaar is op onze eigen techstack. Samengevoegd uit twee losse onderzoeken
> (concurrentieanalyse + InSpace-diepteduik) van juli 2026 — sindsdien niet herhaald.
>
> **Status-check tegen de huidige app:** de fases "meten → adviseren → genereren" uit
> §2 hieronder zijn inmiddels gebouwd (zie [abcplan.md](./abcplan.md) en
> [optimalisatie.md](./optimalisatie.md)). **Publicatie naar een CMS is niet
> geautomatiseerd** — de klant publiceert zelf, en de app verifieert achteraf via HTTP of
> de content op de live pagina staat (`lib/pipeline/publish-check.ts`). Dat is een bewuste,
> nog openstaande keuze, geen vergeten stap.

---

## Deel 1 — Concurrentieanalyse GEO-tracking tools

### 1. Samenvatting in één blik

De GEO-markt is in 2026 hard gegroeid en grofweg in drie kampen te verdelen:

| Kamp | Voorbeelden | Kenmerk | Prijs |
|------|-------------|---------|-------|
| **Enterprise / data-diep** | Profound, Semrush AI Toolkit, Ahrefs Brand Radar | Zeer veel data, veel engines, steile leercurve | $$$ ($270–$2.000+/mnd) |
| **Betaalbaar / prompt-niveau** | Peec AI, LLM Pulse, Otterly.AI | Sterke tracking, visueel, betaalbaar | $$ (€25–€89/mnd) |
| **Simpel / makkelijk** | AthenaHQ, Visiblie, Goodie | Weinig features, snelle setup, PR/comms-teams | $$ (€79–$295/mnd) |

**De belangrijkste conclusie voor ons:** vrijwel álle tools tonen dezelfde 3–4 kernmetrieken (zichtbaarheidsscore, share of voice, citaties/bronnen, sentiment). Het verschil zit in **hoeveel** ze eromheen stapelen. De "makkelijke" tools (AthenaHQ, Otterly) winnen klanten juist omdat ze *minder* laten zien — precies het gat waar wij in gaan zitten.

### 2. Concurrenten in detail

**Profound** — enterprise-GEO, diepste inzichten. $270–$2.000+/mnd. Data-heavy dashboard waar training voor nodig is; uniek **Prompt Volumes-paneel**. *Les: krachtig maar overkill voor het MKB — te veel complexiteit voor "don't make me think".*

**Peec AI** — betaalbaar, prompt-niveau tracking. Vanaf €85–€89/mnd, geen feature-gating (alle plannen alle features). Visueel dashboard met tag-cloud overlays, 9+ engines. *Les: de visuele tag-aanpak is aantrekkelijk, maar 9+ engines maken het snel druk. Hun simpele "geen feature-gating"-prijsmodel is wél sympathiek.*

**AthenaHQ** ⭐ meest relevant benchmark — de makkelijkste GEO-tool, voor teams zonder SEO-kennis. $295/mnd (eerste maand $95). "Super easy setup", optimization-agents, won een 30-daagse test met +45% answer share. Mist diepe concurrentieanalyse. *Les: bewijst dat "makkelijk" een winnende positionering is — maar hun prijs laat ruimte voor een goedkoper, nóg simpeler alternatief.*

**Otterly.AI** — toegankelijke instap-GEO vanaf **$25/mnd**, het goedkoopste instappunt in de markt. Relevante prijs-benchmark voor onze eigen tiering.

**SE Ranking (SE Visible)** — schone interface, maar AI-zichtbaarheid zit verstopt in een grote SEO-suite.

**Semrush AI Toolkit & Ahrefs Brand Radar** — add-ons bovenop bestaande SEO-giganten ($99+/mnd resp. 400M prompts/mnd gedekt). Aantrekkelijk voor wie die tools al heeft, irrelevant voor een klant die gewoon wil weten of AI zijn merk noemt.

**Overige spelers**: Frase (tracking + content-workflow), LLM Pulse, Visiblie (€79/mnd), Goodie, Rankscale, Hall, Writesonic ($499/mnd Advanced).

### 3. Hoe richten concurrenten hun dashboards in?

Rode draad — vrijwel iedereen toont: zichtbaarheidsscore (0–100) als hoofd-KPI, share of voice, citaties/bronnen, sentiment, prompt-niveau detail, trend over tijd, engine-uitsplitsing.

**Patronen die goed werken:** één hoofdgetal bovenaan, visuele i.p.v. tekstuele weergave, real-time alerts, snelle onboarding met voorgestelde prompts.

**Patronen om te vermijden:** data-overload (Profound), te veel engines (9–10+, meer ruis dan waarde voor MKB), feature-stapeling in één scherm, GEO verstopt in een SEO-suite, enterprise-prijzen die MKB'ers buitensluiten.

### 4. Marktgat & onze positionering

| Dimensie | Markt (gemiddeld) | GEO Tracker (wij) |
|----------|-------------------|-------------------|
| Aantal metrieken op hoofdscherm | 6–10+ widgets | **1 hoofdgetal + enkele verdiepingen** |
| Onboarding | Vaak demo/sales-call nodig | **Self-serve, minuten** |
| Doelgroep | Enterprise / SEO-experts | **MKB / marketeers zonder SEO-kennis** |
| Filosofie | "meer data = beter" | **"stupid simple, don't make me think"** |

**Conclusie:** de markt heeft veel krachtige, dure en complexe tools. Het onderbelichte segment is de klant die simpelweg wil weten *"noemt AI mijn merk, hoe vaak, en is het positief?"* — zonder dashboard-training en zonder enterprise-budget. AthenaHQ bewijst dat "makkelijk" verkoopt; wij zitten daar nóg simpeler in.

### 5. Bronnen (Deel 1)

- [Best GEO tools 2026 — Superlines](https://www.superlines.io/articles/best-generative-engine-optimization-tools)
- [Best GEO Tools 2026 — Fingerlakes1](https://www.fingerlakes1.com/2026/03/08/best-generative-engine-optimization-geo-tools-in-2026-what-actually-use-to-track-ai-visibility/)
- [Leading GEO Tools 2026 — SitePoint](https://www.sitepoint.com/best-generative-engine-optimization-tools/)
- [Top GEO Tools 2026 — NoGood](https://nogood.io/blog/generative-engine-optimization-tools/)
- [11 Best GEO Tools — Geoptie](https://geoptie.com/blog/best-geo-tools)
- [Best AI Visibility Tracking Tools — Rivo](https://www.rivo.io/blog/ai-visibility-tracking-tools)
- [Profound vs PEEC vs AthenaHQ — Writesonic](https://writesonic.com/blog/profound-vs-peec-vs-athenahq-comparison)
- [AthenaHQ vs Profound vs Peec.ai 30-day test — AthenaHQ](https://athenahq.ai/articles/athenahq-vs-profound-vs-peec-ai-30-day-geo-platform-test-results/)

---

## Deel 2 — InSpace / Nova: kan dit met onze techstack?

InSpace (Eindhoven) verkoopt **Nova**, een "autonoom AI-SEO-platform" dat de volledige
SEO-/GEO-workflow automatiseert: het **produceert en publiceert zelf content** om
zichtbaarheid te verbeteren, en optimaliseert daarna continu. Dat is de stap voorbij
"meten" naar "handelen" — precies de richting die deze app op is gegaan.

### Prijs (ter referentie)

| Plan | Prijs/mnd | Pagina's/mnd |
|------|-----------|--------------|
| Stratosphere | $1.000 | 10 |
| Milky Way | $1.700 | 20 |
| Universe | $3.000 | 40 |

Enterprise/agency-prijzen; de waarde zit in **geproduceerde content per maand**, niet in tracking. Backlink-building zit er niet in.

### De Nova-workflow (5 fasen)

0. **Brand DNA** — merkidentiteit, tone-of-voice, producten, concurrenten, persona's.
1. **Onderzoek** — keyword-kansen, search intent, concurrent-gaps, AI-search-trends.
2. **Strategie & kalender** — clustering naar een geprioriteerde content-backlog.
3. **Content-generatie** — artikelen, landingspagina's, FAQ's, hub-pagina's, on-brand.
4. **Publicatie** — goedgekeurde pagina's gaan direct het CMS in (WordPress, Shopify, Webflow, HubSpot, ...), met metadata/schema/interne links. Menselijk approval-moment vóór publicatie.
5. **Continue optimalisatie ("self-healing")** — blijft prestaties monitoren en herschrijft automatisch wat onderpresteert; lus sluit terug naar fase 1.

### Wat hebben we hiervan gebouwd, en wat niet?

| Nova-onderdeel | Bij ons | Status |
|----------------|---------|--------|
| Brand DNA / onboarding | Profiel-crawl + LLM-extractie (`lib/pipeline/profile-research.ts`) | ✅ Gebouwd |
| Keyword-/prompt-research | Onderwerp-research + 30 prompts (`lib/pipeline/topic-research.ts`, `prompts.ts`) | ✅ Gebouwd, eigen invulling |
| Content-generatie | 3-staps redactieproces: schrijven → kritiek → herschrijven (`lib/pipeline/content.ts`) | ✅ Gebouwd |
| Approval-workflow | Content Bibliotheek: klant reviewt vóór publicatie | ✅ Gebouwd |
| **Publicatie naar CMS** | — | ❌ **Niet gebouwd.** Klant publiceert zelf; de app verifieert via HTTP-fetch (`publish-check.ts`) dat de content live staat |
| Self-healing (auto-herschrijven bij onderprestatie) | Effect wordt gemeten (`lib/pipeline/impact.ts`), maar geen automatische herschrijf-trigger | ⚠️ Deels — meting staat, de "herschrijf automatisch"-lus niet |
| Off-site zichtbaarheid | Bronnenlandschap, presence-checks, entity-presence (`lib/offsite/`) | ✅ Gebouwd, eigen invulling (Nova doet dit niet expliciet) |
| Technische AI-crawler-toegang | `lib/audit/` — checkt of AI-bots de site kunnen bereiken | ✅ Gebouwd, eigen toevoeging (zat niet in Nova's beschrijving) |

**Nog altijd de grootste openstaande brok:** een CMS-publisher (WordPress REST API, Shopify Admin API, Webflow API, ...). Elke CMS is een eigen, te onderhouden integratie met eigen auth-model. Dat is code die nog niet bestaat — niet een kwestie van AI-kwaliteit maar van losse platform-integraties, credential-beheer (OAuth per CMS), preview-vóór-publicatie, rollback en audit-logging voor schrijftoegang tot een klant-website.

**Overige structurele aandachtspunten, nog steeds relevant:**
- **Contentkwaliteit op schaal** blijft doorlopend werk (prompt-engineering, redactionele kwaliteitsbewaking) — zie [optimalisatie.md](./optimalisatie.md) voor wat daar al aan gedaan is (grounding op eigen feiten, redactie-lus).
- **Keyword-/volume-data**: er is geen eigen zoekvolume-index; de app gebruikt LLM-inschatting in banden (laag/midden/hoog) i.p.v. een externe betaalde bron zoals DataForSEO/Semrush.
- **Meertaligheid**: nog niet aan de orde geweest.

### Menselijke inbreng die ook bij ons blijft

Ook als Nova-achtige dienst blijft een deel bewust menselijk: CMS-onboarding per klant
(zodra die integratie er is), content-approval vóór publicatie, en kwaliteitsbewaking van
prompts/output. Dat is geen tekortkoming maar een verkoopargument — presenteer het als
kwaliteitsgarantie, zoals InSpace dat doet met hun Customer Success Manager.

### Bronnen (Deel 2)

- [InSpace — homepage (Nova)](https://inspace.io/)
- [InSpace — pricing](https://inspace.io/pricing)
- [InSpace — keyword research voor GEO](https://inspace.io/blog/how-to-do-keyword-research-for-geo)
- [InSpace — structured data voor GEO](https://inspace.io/blog/how-to-use-structured-data-for-geo)
- [Launchmind vs InSpace (Nova) — vergelijking](https://launchmind.io/en/vs/inspace/)

---

*De visuele stijl van InSpace die uit dit onderzoek volgde, is apart uitgewerkt in [designsystem.md](./designsystem.md).*
