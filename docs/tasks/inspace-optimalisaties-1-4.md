# Optimalisaties 1–4 — structuur-denken en geautomatiseerde QA

**Status:** GEBOUWD op 4 augustus 2026 · **Opgesteld:** 3 augustus 2026
**Uitkomst:** zie `logbook.md`, "de vier InSpace-optimalisaties". Alle vier gebouwd zoals
hieronder beschreven, met één afwijking: de gap-analyse landde óók in het aanbodpaneel op het
profielscherm, omdat bij het bouwen bleek dat dat paneel helemaal niet gerenderd werd.
**Aanleiding:** analyse van de werkwijze van InSpace Nova (blogposts + informatie van een
medewerker), zie `logbook.md` §12.

**API-kosten: nul.** Geen van deze vier voegt een AI-aanroep toe. Punt 2 verandert wel wat er in de
bestaande schrijfprompt staat, maar niet hoe vaak hij draait.

---

## 0. Wat we van InSpace overnemen, en wat niet

Hun kernthese uit *"Everyone is building AI that writes blogs"* is dat het schrijven het makkelijke
deel is en de **architectuur** het moeilijke: welke pagina's mist een site, en hoe bouw je die in
iemands CMS. Dat tweede is bewust uitgesteld in dit project. Het eerste niet, en daar zit punt 1.

Drie dingen die zij als onderscheidend presenteren hebben wij al, en die staan dus niet in dit plan:

| Wat zij noemen | Wat wij al hebben |
|---|---|
| RAG-anker tegen hallucinatie | `brand_facts` + de feitenkaart: "staat het er niet op, dan bestaat het niet" |
| Guardrails vóór generatie | `content-gate.ts`, `validate-claims.ts`, `isSupported()` |
| Answer-first opmaak | Regel 4 van de schrijfprompt, deterministisch nagerekend in de poort |

Wat zij hebben en wij niet: structuur-denken (punt 1), volledige schema-dekking (2) en
geautomatiseerde QA op duplicatie en leesbaarheid (3, 4).

---

## 1. Structurele gap-analyse — welke pagina's mist de site? (1 d)

### Het probleem

Onze aanbevelingen komen uit **gemiste vragen**: de meting stelt 30 vragen, bij 17 wordt de klant
niet genoemd, daar volgen pagina's uit. Dat is reactief. Levert een klant twaalf diensten en raakt
de meting er toevallig vier, dan hoort hij over acht diensten niets — ook al heeft hij er geen
pagina voor.

InSpace draait het om: eerst vaststellen welke pagina's de sitestructuur mist, dán schrijven. Sinds
de aanbodboom (`profile_offerings`) hebben wij de data daarvoor liggen. Het is één vergelijking die
we nog niet maken.

### Ontwerp

Nieuw: `lib/pipeline/structure-gap.ts` — **puur, geen `server-only`** (conventie 2).

```ts
export type PaginaDekking = "eigen_pagina" | "zwak_gedekt" | "ontbreekt";

export interface OfferingCoverage {
  offeringId: string;
  name: string;
  kind: ProfileOffering["kind"];
  dekking: PaginaDekking;
  /** De pagina die er het dichtst bij komt. Null bij `ontbreekt`. */
  matchedUrl: string | null;
  /** Waarom dit als match geldt. Voor de uitleg in de UI. */
  reason: string;
}

export function assessStructureCoverage(
  offerings: ProfileOffering[],
  pages: { url: string; title: string | null; text: string | null }[],
): { coverage: OfferingCoverage[]; missing: number; weak: number };
```

**De matching hergebruikt `page-relevance.ts`.** Dat bevat al `topicTerms()` en `scorePage()`, die
precies dit doen: termen uit een onderwerp scoren tegen een pagina. Een tweede matchingalgoritme
bouwen zou twee plekken opleveren die het oneens kunnen worden.

Drie uitkomsten en niet twee, want het verschil stuurt het advies:

- **`eigen_pagina`** — er is een pagina waarvan de URL-slug óf de titel de dienstnaam bevat. Dat is
  een eigen pagina, geen vermelding in een opsomming.
- **`zwak_gedekt`** — de dienst komt wel in de tekst van een pagina voor, maar die pagina gaat
  ergens anders over. Advies: *verbeteren*.
- **`ontbreekt`** — nergens gevonden. Advies: *nieuw*.

⚠️ **Het vangnet.** Een categorie met vier subdiensten telt niet als "ontbreekt" zodra de
categoriepagina bestaat — anders adviseert de app vijf pagina's waar er één hoort. Knopen met
`kind: "categorie"` die zelf kinderen hebben, worden beoordeeld op de categorie en niet op elk kind
apart. `kind: "merk"` valt er helemaal buiten: een retailer hoeft geen pagina per gevoerd merk.

### Waar het landt

**Geen opslag, geen migratie.** De dekking is volledig afgeleid uit twee tabellen die allebei klein
zijn, en hij verandert zodra er een pagina bijkomt. Opslaan zou een vierde plek opleveren die kan
verouderen. Berekenen bij het lezen.

Drie afnemers:

1. **Het aanbodpaneel** — per knoop een chip `geen pagina` of `zwak gedekt`, en bovenaan één regel:
   *"8 van je 12 diensten hebben geen eigen pagina."*
2. **De rapportinvoer** (`buildReportInput` in `report.ts`) — een blok met de ontbrekende pagina's,
   zodat B2 aanbevelingen doet die de structuur dekken en niet alleen de toevallig gemeten vragen.
   Dit is de plek waar het echt verschil maakt.
3. **`ProfileGaps`** — als er meer dan vier ontbreken is dat een gespreksonderwerp.

### Verificatie

- Fysi-Unique: de diensten waarvoor een `/diensten/…`-pagina bestaat komen op `eigen_pagina`, de
  rest op `ontbreekt`.
- Een categorie met kinderen én een eigen pagina levert **één** dekking op, niet vijf gaten.
- Unittest met een handgemaakte boom + paginalijst, inclusief het categorie-geval.

---

## 2. Rijkere schema.org-opmaak en een zichtbare datum (0,5 d)

### Het probleem

`schema-jsonld.ts` kent drie uitkomsten: `FAQPage`, `WebPage`, `Article`. InSpace gebruikt
`Service`, `Product`, `Organization`, `LocalBusiness`, `HowTo`, `Person`, `BreadcrumbList` — en
noemt een zichtbare `dateModified` expliciet als versheidssignaal. Wij zetten die nergens.

Dat is een gat in ons eigen verhaal: sinds de entiteitscontrole **beoordelen wij de klant op
schemadekking**, terwijl onze eigen gegenereerde pagina's het mager doen.

### Ontwerp

**a) Het type volgt het bedrijfsmodel, niet alleen het contenttype.**

| contenttype | dienstverlener | retailer / fabrikant | platform / overig |
|---|---|---|---|
| `landing` | `Service` | `CollectionPage` | `WebPage` |
| `faq` | `FAQPage` | `FAQPage` | `FAQPage` |
| `comparison` | `WebPage` | `WebPage` | `WebPage` |
| `article` | `Article` | `Article` | `Article` |

`business_model` staat al op `profiles` (migratie 0032) en wordt nergens voor dit doel gebruikt.

**b) Een `@graph` met twee knopen in plaats van één los object.** De pagina, plus de organisatie
erachter met `@id`, `name`, `url` en `sameAs`. Die `sameAs`-lijst hebben we al liggen: fase 0 oogst
hem uit de JSON-LD van de klant en zet hem in het `techniek`-facet. InSpace noemt `sameAs` letterlijk
als de manier waarop een AI-systeem bevestigt dat het over hetzelfde bedrijf gaat.

**c) `datePublished` en `dateModified`**, uit `content_pieces.created_at` / `updated_at`.

**d) Een zichtbare regel onderaan de tekst**: *"Laatst bijgewerkt: 3 augustus 2026."* Versheid in de
opmaak die de bezoeker niet ziet, is de helft van het signaal.

**e) De validatie wordt strenger.** Nu accepteert `validateOrRebuildJsonLd()` alles met een
`@context` en een `@type` — dus ook een `Recipe` op een dienstenpagina. Voortaan: het modelresultaat
wordt alleen behouden als het `@type` in de tabel hierboven past; anders bouwen we het zelf. Onze
velden (datums, organisatieknoop) worden er altijd **overheen** gezet, ook bij een geldig
modelresultaat — die weten wij zeker en het model gokt ze.

### Verificatie

- Een `landing`-pagina bij een dienstverlener levert `Service` op, bij een retailer `CollectionPage`.
- Een verzonnen `@type` van het model wordt vervangen, niet bewaard.
- `dateModified` staat er altijd in, ook als het model hem wegliet.
- De organisatieknoop draagt de `sameAs` uit fase 0 zodra die er is.
- Unittest per geval; `publish-check.ts` leest het `@type` al uit de gepubliceerde pagina en blijft
  dus werken.

---

## 3 en 4. Geautomatiseerde QA: duplicatie en leesbaarheid (1 d samen)

Deze twee horen bij elkaar: ze grijpen op dezelfde plek aan en hebben hetzelfde ontwerpprobleem.

### Het ontwerpprobleem, en waarom het ertoe doet

`geo_score` wordt berekend uit `checkContentGate()`. Er twee checks bij zetten betekent dat de score
van een pagina van vorige maand niet meer te vergelijken is met die van vandaag — en de app toont
juist trends. Dat is precies het soort stille breuk waar dit project vangnetten tegen bouwt.

**De oplossing: een tweede, aparte uitkomst.** `checkContentGate()` houdt zijn zeven GEO-checks en
zijn score. Daarnaast komt er `checkQuality()` met de nieuwe controles. Die voedt `review_notes` en
`needs_review`, maar **niet** `geo_score`.

```ts
export interface QualityChecks {
  /** Lijkt deze pagina te veel op een andere pagina van hetzelfde merk? */
  nietDubbel: CheckUitkomst;
  /** Is de tekst te lezen voor een gewone bezoeker? */
  leesbaar: CheckUitkomst;
}
```

### 3. Duplicatiedetectie

**Waarom dit een echt risico is, geen theorie.** Wij schrijven tot tien pagina's per merk uit
**dezelfde feitenkaart**, met dezelfde stijlvoorbeelden en dezelfde merkregels. Dat is het recept
voor pagina's die op elkaar lijken. Niemand meet het, en de klant ziet het pas als hij ze naast
elkaar legt.

Nieuw: `lib/pipeline/similarity.ts`, puur.

```ts
/** Jaccard-overlap op woord-5-grammen. 0 = niets gemeen, 1 = identiek. */
export function similarity(a: string, b: string): number;
export function mostSimilar(text: string, others: { title: string; body: string }[]):
  { title: string; score: number } | null;
```

Vijf-grammen en geen losse woorden: twee dienstenpagina's van dezelfde praktijk delen
onvermijdelijk hun vakjargon, maar niet hun zinsbouw. **Drempel 0,35**, bewust ruim — en de
gemeten waarde wordt altijd gelogd, zodat we hem na tien echte pagina's kunnen bijstellen op data
in plaats van op gevoel.

**Waar het draait.** De vergelijking heeft de database nodig en de poort is puur. Dus:
`content.ts` haalt de andere `is_current`-pagina's van **hetzelfde profiel** op (niet alleen
dezelfde analyse — een merk heeft meerdere analyses en die putten uit dezelfde feiten), berekent de
gelijkenis, en geeft het resultaat mee aan `checkQuality()`. Die maakt er een check en een leesbaar
verbeterpunt van: *"Deze pagina lijkt voor 41% op 'Wat kost dry needling?'. Overweeg ze samen te
voegen of scherper af te bakenen."*

### 4. Leesbaarheid

Nieuw: `lib/pipeline/readability.ts`, puur.

**Geen verzonnen Flesch-score.** Een getal van 0-100 op Nederlandse tekst suggereert een precisie
die de formule niet heeft, en niemand weet wat 58 betekent. In plaats daarvan drie gemeten
grootheden en een oordeel in gewone taal:

```ts
export interface ReadabilityResult {
  gemiddeldeZinslengte: number;
  /** Zinnen langer dan 30 woorden — die leest niemand in één keer. */
  langeZinnen: number;
  /** Aandeel woorden van 4+ lettergrepen (geschat op klinkergroepen). */
  langeWoordenRatio: number;
  /** Passieve constructies: "wordt … door", "werd … door". */
  passief: number;
  oordeel: "goed" | "stroef" | "moeilijk";
}
```

Het verbeterpunt noemt het **aantal**, niet de score: *"12 zinnen zijn langer dan 30 woorden. Knip
ze in tweeën."* Dat is uitvoerbaar; "leesbaarheidsscore 58" niet.

Drempels om mee te beginnen, af te stellen op echte pagina's: `stroef` bij een gemiddelde
zinslengte boven 20 of meer dan 15% lange zinnen, `moeilijk` boven 25 of 25%.

### Verificatie

- Twee bijna-identieke teksten scoren boven 0,8; twee onafhankelijke dienstenpagina's onder 0,2.
- Een tekst met alleen korte zinnen is `goed`; een tekst met vijf zinnen van 40 woorden is
  `moeilijk`.
- `geo_score` verandert **niet** door deze twee checks — unittest die dat vastlegt.
- Beide checks zetten `needs_review = true` bij overschrijding, en het verbeterpunt noemt een
  concreet aantal.

---

## Bouwvolgorde en samenhang

| # | Wat | Dagen | Waarom hier |
|---|---|---|---|
| 1 | Structurele gap-analyse | 1 | Grootste opbrengst, en het maakt de aanbodboom uit de onboarding pas nuttig |
| 2 | Schema + datum | 0,5 | Los van de rest, dicht een inconsistentie in ons eigen verhaal |
| 3+4 | Duplicatie + leesbaarheid | 1 | Zelfde bestand, zelfde poort, zelfde tests |
| — | Documentatie en de vier vaste controles | 0,5 | |

De drie blokken raken elkaars bestanden niet en kunnen in elke volgorde.

## Wat dit NIET is

- **Geen CMS-koppeling.** Dat is InSpace's moeilijke deel en blijft uitgesteld.
- **Geen echte zoekvolumes.** Zie de analyse: dat is hun SEO-verleden, en onze winbaarheidsmeting
  (`elicit_rate`) is voor dit product een beter signaal en bestaat al.
- **Geen interne links of clusters.** Die staan als punt 6 en 7 op de lijst en vragen eerst dat
  clusters bruikbaar worden (roadmap R0.3).
- **Geen nieuwe migratie.** Alle vier werken op data die er al staat.
