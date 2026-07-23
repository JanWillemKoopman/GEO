# InSpace.io (Nova) — Analyse & Bouwplan

> Diepgaande analyse van hoe **inspace.io** met hun product **Nova** werkt, en een concreet plan of — en hoe — we eenzelfde dienst kunnen bouwen op onze techstack (Claude Code, GitHub, Vercel, Node.js, Supabase). Inclusief wat er ontbreekt en welke handmatigheid er voor jou bij komt kijken.

*Onderzoek: juli 2026. Bronnen onderaan.*

> **🎨 Visuele stijl:** de kleuren/typografie/componenten-analyse van InSpace uit dit document is later verdiept en apart vastgelegd in **[designsystem.md](./designsystem.md)** — raadpleeg dat document voor de daadwerkelijke design-tokens bij het bouwen van de UI.

---

## 1. Wat is InSpace / Nova?

InSpace (gevestigd in Eindhoven, NL) verkoopt **Nova**: een "autonoom AI-SEO-platform" dat de **volledige SEO- én GEO-workflow automatiseert**. Waar onze GEO Tracker (tot nu toe) *meet* of AI je merk noemt, gaat Nova een grote stap verder: het **produceert en publiceert zelf content** om die zichtbaarheid actief te verbeteren, en optimaliseert daarna continu.

De kernbelofte: *"We turned SEO into Smart AI-Software"* — geen bureau met uren, maar software die 24/7 onderzoekt, schrijft, publiceert en bijstuurt, met een menselijke Customer Success Manager als vangnet.

**Dit is het verschil tussen "meten" en "waarde leveren":**
- GEO-tracker (meten): *"AI noemt je 12% van de tijd, je concurrent 40%."*
- Nova (handelen): *"...en hier zijn 20 nieuwe pagina's die we deze maand publiceren zodat AI jóu gaat noemen."*

Dat "handelen" is de echte waarde waar bedrijven voor betalen — en precies wat jij wil aanbieden.

---

## 2. Wat doet Nova precies? (feiten uit onderzoek)

### Prijs
Drie tiers (per maand, kortingen bij jaarcontract):
| Plan | Prijs/mnd | Pagina's/mnd | Content-types |
|------|-----------|--------------|---------------|
| Stratosphere | $1.000 | 10 | Long-tail & vraag-artikelen, informational posts |
| Milky Way ⭐ | $1.700 | 20 | + cluster-hubs (product/categorie), conversie-servicepagina's |
| Universe | $3.000 | 40 | + locatie-pagina's |

> Let op: dit zijn **enterprise/agency-prijzen**. De waarde zit niet in tracking maar in **geproduceerde content per maand**. Backlink-building zit er níet in (apart in te kopen). Dit bevestigt: content-productie is het betaalde product, tracking is bijzaak.

### CMS-integraties
Publiceert direct in: WordPress, Shopify, WooCommerce, Magento, Wix, Webflow, HubSpot, Storyblok, Framer. Meertalig (o.a. NL, EN, DE, FR).

### Resultaten (uit case studies)
Laminaat.nl +30.000 organische bezoekers/mnd; +380% / +274% organisch verkeer bij anderen.

---

## 3. De volledige Nova-workflow (gereconstrueerd)

Nova draait een gesloten lus van 5 fasen. Hieronder elk in detail, plus hun eigen 6-staps keyword/GEO-methodiek die onder Fase 1–2 valt.

### Fase 0 — Onboarding & "Brand DNA"
Nova bestudeert vóór het schrijven: merkidentiteit, **tone of voice**, producten/diensten, concurrenten, buyer persona's en de customer journey. Dit "Brand DNA" is de basis waarop alle content on-brand blijft.

### Fase 1 — Onderzoek (research)
Autonoom scannen van: keyword-kansen, search intent, concurrent-gaps en AI-search-trends.

Hun **6-staps GEO-keyword-methodiek**:
1. **Start met buyer-context** — jobs, pains, constraints uit sales-calls, support-tickets, reviews. Natuurlijke vragen i.p.v. losse keywords ("hoe rank ik in maps voor spoed-loodgieter in Austin 's nachts").
2. **Optimaliseer op intent** — LLM's groeperen anders verwoorde prompts onder dezelfde intentie; focus op de onderliggende job-to-be-done + disambiguerende entiteiten (locatie, budget, tools).
3. **Cluster op gedeelde intentie** — groepeer prompts per probleem, vertaal clusters naar site-architectuur (pagina's + navigatie).
4. **Test over AI-engines** — representatieve prompts testen in ChatGPT (browsing), Perplexity, Gemini, Claude: word je geciteerd, en welke concurrent-bronnen komen op?
5. **Prioriteer op waarde × volume × kans** — score clusters op business-waarde, frequentie en huidige zichtbaarheidsgap.
6. **Maak LLM-geoptimaliseerde content** — begin met het directe antwoord, heldere structuur, concrete datapunten, geciteerde bronnen, schema-markup.

### Fase 2 — Strategie & content-kalender
Nova "clustert wat ertoe doet en legt een volledige content-kalender neer. Geen strateeg nodig." Output: een geprioriteerde backlog van te maken pagina's, gegroepeerd in topic-clusters.

### Fase 3 — Content-generatie
Genereert **artikelen, landingspagina's, FAQ's, product/categorie-hubs, service- en locatiepagina's** — on-brand, expert-niveau, geschreven om zowel klassieke search als AI-antwoorden te winnen. Inclusief programmatic SEO (templates + data → pagina's op schaal).

### Fase 4 — Publicatie
Goedgekeurde pagina's gaan **direct de CMS in**, met metadata, schema-markup en interne links, en worden ingediend voor indexering. "Geen handmatige uploads, geen dev-tickets." Let op het woord **goedgekeurd** — er zit een menselijk approval-moment in.

### Fase 5 — Continue optimalisatie ("self-healing")
Nova blijft rankings, AI-zichtbaarheid en on-page-performance monitoren en **herschrijft/herstructureert automatisch** wat onderpresteert. De lus sluit terug naar Fase 1.

### Menselijke inbreng bij Nova
- **Approval-workflow** vóór publicatie (mens keurt goed).
- **CMS-koppeling** eenmalig opzetten (credentials/OAuth).
- **Customer Success Manager** check-ins (bewust half-automaat, geen pure black-box).

---

## 4. Kan dit met onze techstack? (per component)

**Kort antwoord: ja, de kern is goed bouwbaar op Node.js + Vercel + Supabase. De echte uitdaging is niet de code, maar de CMS-integraties, de contentkwaliteit en de operationele lus.**

| Nova-onderdeel | Onze techstack-invulling | Haalbaarheid |
|----------------|--------------------------|--------------|
| Brand DNA / onboarding | Crawl site (fetch + parser) → LLM extraheert merk, tone, producten, persona's → opslaan in Supabase | ✅ Goed haalbaar |
| Keyword/prompt-research | LLM met web-search-tool (OpenAI, vastgelegde keuze — zie [abcplan.md](./abcplan.md)) + evt. externe keyword-data-API | ✅ Kern haalbaar; volume-data vergt externe API |
| Clustering & kalender | LLM + eigen scoring-logica in Node.js, opgeslagen als backlog in Supabase | ✅ Goed haalbaar |
| Content-generatie | OpenAI (`gpt-4.1-nano`) via API-routes; templates voor programmatic pages | ✅ Goed haalbaar (kwaliteit = werk) |
| Publicatie naar CMS | Node.js-connectors per CMS (WordPress REST API, Shopify Admin API, Webflow API…) | ⚠️ Grootste bouwlast — elke CMS is een apart project |
| Schema/metadata/interne links | Generatie in Node.js bij het opmaken van de pagina | ✅ Haalbaar |
| Tracking & self-healing | Bestaande GEO-tracker + scheduler (Supabase cron / Vercel cron) die onderpresteerders markeert en herschrijft | ✅ Haalbaar, iteratief |
| Dashboard | Next.js op Vercel | ✅ Goed haalbaar |
| E-mail (rapporten/alerts) | Resend | ✅ Goed haalbaar |
| Auth & data | Supabase (Auth + Postgres + RLS + cron/edge functions) | ✅ Precies waarvoor bedoeld |

### Architectuur op hoofdlijnen (onze versie)

```
Klant / prospect
      │  (1) website-URL
      ▼
Vercel (Next.js / Node.js)
 ├─ Crawler + Brand-DNA-extractie ────► LLM (grounding)
 ├─ Research → Clustering → Kalender ─► LLM + scoring
 ├─ Content-generator ───────────────► OpenAI API (gpt-4.1-nano)
 ├─ Approval-UI (mens keurt goed)
 ├─ CMS-publisher ──► WordPress / Shopify / Webflow API's
 └─ Tracking-scheduler (cron) ───────► OpenAI API (gpt-4.1-nano)
      │
      ▼
Supabase (Postgres + Auth)
 brands · brand_dna · clusters · content_backlog ·
 generated_pages · publications · tracking_runs · mentions
      │
      ▼
Resend ──► rapport- en alert-e-mails
```

---

## 5. Wat ontbreekt er nog / wat is het moeilijkst?

De code is het probleem niet; dit zijn de echte gaten tussen "GEO-tracker" en "Nova-achtige dienst":

1. **CMS-publicatie is de grootste brok.** Elke CMS (WordPress, Shopify, Webflow, HubSpot…) heeft een eigen API, auth-model en content-model. Dit is geen weekendklus maar per platform een aparte, te onderhouden integratie. **Advies: start met één CMS (WordPress REST API — grootste marktaandeel) en breid pas uit op vraag.**
2. **Contentkwaliteit & merit.** AI-content op schaal die *écht* rankt en geciteerd wordt, vereist sterke prompts, redactionele richtlijnen, feitcontrole en anti-"AI-slop"-maatregelen. Google's spam-beleid straft dunne content af. Dit is voortdurend prompt-engineering + kwaliteitsbewaking.
3. **Keyword-/volume-data.** Nova gebruikt search-volume-signalen. Wij hebben geen eigen index; we hebben een externe bron nodig (bv. DataForSEO, Semrush API, of Google-signalen) of we leunen puur op LLM-inschatting (goedkoper, minder precies).
4. **Self-healing lus.** "Detecteer onderpresteerder → herschrijf → herpubliceer" vergt betrouwbare performance-attributie (welke pagina wint/verliest zichtbaarheid) en veilige her-publicatie zonder de klant-site te breken.
5. **Meertaligheid.** Nova doet NL/EN/DE/FR. Elke taal = extra kwaliteitsbewaking en native-review.
6. **Programmatic SEO op schaal** zonder door spamfilters gepakt te worden = template- + data-engineering + kwaliteitsdrempels.
7. **Veiligheid & vertrouwen.** Je krijgt schrijf-toegang tot de website van een klant. Dat vraagt om robuuste auth (OAuth per CMS), preview-vóór-publicatie, rollback en audit-logging.

---

## 6. Welke handmatigheid komt er voor JOU bij kijken?

Ook Nova is niet 100% autonoom — en bij jou (zeker in het begin) zal de mens-in-de-lus groter zijn. Realistische handmatige taken:

| Taak | Waarom handmatig (nu) | Kan later geautomatiseerd? |
|------|----------------------|----------------------------|
| **CMS-koppeling per klant** | Credentials/OAuth, testen dat publiceren werkt | Deels — na de eerste integratie herhaalbaar |
| **Content-review vóór publicatie** | Kwaliteit, feiten, merk-safety; klant wil goedkeuren | Deels — vertrouwen groeit, maar approval blijft verkoopargument |
| **Brand-DNA-controle** | LLM-extractie kan de tone/positionering missen | Ja, met feedback-loop |
| **Onboarding-gesprek** | Verwachtingen, doelen, toegang regelen (jouw "Customer Success") | Blijft deels menselijk — is juist een pluspunt |
| **Kwaliteitsbewaking van prompts/templates** | Voorkomen van AI-slop, tuning per branche | Doorlopend werk |
| **Escalatie bij fouten** | Publicatie ging mis, verkeerde info gepubliceerd | Monitoring + alerts verkleinen dit |
| **Sales & rapport-opvolging** | Jouw acquisitieflow (URL→rapport→e-mail) blijft persoonlijk | Grotendeels automatiseerbaar, opvolging niet |

**Kern:** de menselijke laag zit in **(a) CMS-onboarding, (b) content-approval en (c) kwaliteitsbewaking**. Dit is precies waar InSpace een "Customer Success Manager" voor inzet — presenteer het niet als tekortkoming maar als **kwaliteitsgarantie**.

---

## 7. Gefaseerd bouwplan (van tracker naar Nova-achtig)

Bouw dit incrementeel bovenop de al geplande GEO Tracker. Elke fase is los verkoopbaar.

- **Fase A — Meten (basis, al gepland).** GEO Tracker: URL → auto-prompts → 10 weken monitoren → rapport → e-mail. *Dit is je acquisitiemotor.*
- **Fase B — Adviseren.** Voeg aan het rapport concrete **content-aanbevelingen** toe: "voor deze 5 clusters mist AI jou — dit zijn de pagina's die je nodig hebt." Nog geen productie, wel de brug naar waarde. *Lage bouwlast, hoge verkoopwaarde.*
- **Fase C — Genereren (concept).** LLM produceert daadwerkelijk de aanbevolen pagina's als **concept/preview** (nog geen publicatie). Klant leest en keurt goed in de app. *Dit is al 80% van Nova's waarde, zonder CMS-risico.*
- **Fase D — Publiceren (één CMS).** Bouw de eerste CMS-connector (WordPress REST API). Goedgekeurde content → live, met schema + interne links. *Nu ben je een echte Nova-concurrent voor WordPress-klanten.*
- **Fase E — Optimaliseren (self-healing).** Koppel tracking terug: markeer onderpresteerders, stel herschrijving voor, publiceer bijgewerkt. Sluit de lus.
- **Fase F — Uitbreiden.** Extra CMS'en (Shopify, Webflow), extra talen, programmatic templates — puur op klantvraag.

> **Simpel-houden-principe:** onze onderscheidende kracht blijft "stupid simple". Nova's dashboard is data-rijk en enterprise. Wij kunnen dezelfde motor bieden met een radicaal eenvoudigere UI en een lager instappunt — en de mens-in-de-lus als kwaliteitsbelofte in plaats van als zwakte.

---

## 8. Conclusie

- **Kan het met onze techstack?** Ja. Node.js + Vercel + Supabase + OpenAI (`gpt-4.1-nano`) + Resend dekken de hele lus. Geen fundamentele blokkade.
- **Wat is echt moeilijk?** Niet de AI-calls, maar: **CMS-publicatie-integraties**, **contentkwaliteit op schaal**, en de **veilige self-healing lus** op klant-sites.
- **Wat blijft handmatig voor jou?** CMS-onboarding, content-approval en kwaliteitsbewaking — te positioneren als kwaliteitsgarantie (jouw "Customer Success").
- **Slimste route:** bouw incrementeel (meten → adviseren → genereren → publiceren → optimaliseren). Fase B en C leveren al het grootste deel van Nova's waarde met een fractie van het risico, en passen perfect op jouw bestaande acquisitieflow.

---

## 9. Bronnen

- [InSpace — homepage (Nova)](https://inspace.io/)
- [InSpace — pricing](https://inspace.io/pricing)
- [InSpace — keyword research voor GEO](https://inspace.io/blog/how-to-do-keyword-research-for-geo)
- [InSpace — structured data voor GEO](https://inspace.io/blog/how-to-use-structured-data-for-geo)
- [InSpace — wat is AI SEO](https://inspace.io/blog/what-is-ai-seo-and-how-does-it-work)
- [InSpace — automated SEO software](https://inspace.io/seo-services/automated-seo-software)
- [Launchmind vs InSpace (Nova) — vergelijking](https://launchmind.io/en/vs/inspace/)
- [Top 10 GEO-platforms — Gauge](https://www.withgauge.com/resources/top-10-generative-engine-optimization-geo-platforms-for-ai-visibility)
