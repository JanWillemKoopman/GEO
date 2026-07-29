# Herontwerp van de analyse-flow

*Vervolg op `ux-architectuur-analyse.md`. Dit document gaat over de opzet zelf,
niet over de afwerking. Design-DNA van InSpace blijft ongewijzigd — sterker: het
voorstel maakt de app InSpace-eigener dan hij nu is (zie §5).*

---

## 0. Kort antwoord op de vraag

**Nee, de punten uit de eerste review zijn niet genoeg.**

B1–B8 waren *hygiëne*: dubbele links weg, actieve staat erbij, lege staten
gelijktrekken, loading-states toevoegen. Ze verplaatsen geen enkele informatie
en ze veranderen geen enkele volgorde. Het enige punt dat aan de structuur raakte
(B4) haalde tabs weg — maar liet de onderliggende indeling intact.

Het gevoel "informatie staat overal, ik mis volgorde en logica" is geen
navigatieprobleem. Het is een **modelleerprobleem**: de app is ingedeeld naar
*wat het systeem produceert* (rapport, antwoorden, bibliotheek, instellingen),
terwijl de gebruiker denkt in *wat hij achtereenvolgens wil weten*.

---

## 1. Diagnose

### 1.1 De gebruiker denkt in een lus, de app in een archiefkast

Het product doet in werkelijkheid dit, en altijd in deze volgorde:

```
      meten  →  waar mis ik?  →  wat doe ik eraan?  →  staat het online?  →  werkte het?
        ↑                                                                        │
        └────────────────────────────────────────────────────────────────────────┘
```

De navigatie zegt dit:

```
   [Overzicht]  [Vragen & antwoorden]  [Rapport]  [Content Bibliotheek]  [Instellingen]
```

Vijf gelijkwaardige, parallelle keuzes. **Een tabbalk kán geen volgorde
uitdrukken** — dat is geen labelprobleem dat je met betere woorden oplost, het is
de vorm zelf. Hoe je de tabs ook noemt, ze lezen als een menu waaruit je kiest,
niet als een route die je aflegt. In een product waar de stappen wél strikt op
elkaar volgen, is dat een structurele leugen.

### 1.2 Eén stuk werk kruist vier schermen

Wat er nodig is om één aanbevolen pagina van advies naar resultaat te brengen:

| Stap | Waar | Wat de gebruiker doet |
|---|---|---|
| 1 | **Rapport** | Ziet de aanbeveling, klikt "Genereer" |
| 2 | **Rapport** | Wacht; knop verandert in "Al gegenereerd — bekijk in de Bibliotheek" |
| 3 | **Bibliotheek** | Zoekt het stuk terug in een lijst, eventueel via filters |
| 4 | **Bibliotheek → detail** | Leest, laat herschrijven, publiceert, markeert als gepubliceerd |
| 5 | **Overzicht** (2–4 weken later) | Ziet het effect in `ResultsPanel` |

**Vijf schermen, drie tabblad-wissels, voor één item.** En de status van dat item
— `draft → ready → needs_review → published → gemeten` — bestáát al in de
database (`content_pieces.status`, `.needs_review`, `.published_at`,
`content_impact`). Hij wordt alleen nergens gebruikt als *ordenend principe* van
het scherm. Hij is versierselen op een kaartje in plaats van de as waarlangs
alles staat.

### 1.3 Dezelfde vraag wordt op drie plekken beantwoord

"Waar mis ik zichtbaarheid?" — de kernvraag van het product:

- **Overzicht** → `ScorePanel`: het cijfer, de bandbreedte, de concurrentiebalken
- **Vragen & antwoorden** → `AnswersView`: 30 vragen, gemist/genoemd, met de
  letterlijke tekst
- **Rapport** → "Waar je zichtbaarheid mist" (`gaps`), met per gat een link
  **terug naar Vragen & antwoorden** voor het bewijs

Dat laatste is veelzeggend. Het rapport moet de gebruiker naar een ander tabblad
sturen om zijn eigen bewering te onderbouwen (`rapport/page.tsx:176-183`), en
datzelfde gebeurt nog eens bij elke aanbeveling ("Bekijk wat de AI hier nu
antwoordt", regel 271-279). **De app linkt voortdurend naar zichzelf om de scheiding
te repareren die hij zelf heeft aangebracht.** Dat is het duidelijkste signaal dat
de scheiding er niet hoort te zijn.

### 1.4 Het bewijsstuk: `lib/dashboard.ts`

`loadDashboard()` doet iets wat verder nergens in de app gebeurt: het verzamelt
*al het werk* op één plek. Dat werkt — en precies daarom is het zo pijnlijk om
te zien waar de zes soorten werk naartoe wijzen:

| Soort werk | `href` | Scherm |
|---|---|---|
| Technische blokkade | `/profielen/{id}#techniek` | Profiel, sectie 3 |
| Concept bevestigen | `/analyses/{id}/instellingen` | Analyse, tab 5, onderaan |
| Er ging iets mis | `/analyses/{id}` | Analyse, tab 1 |
| Pagina publiceren | `/analyses/{id}/bibliotheek` | Analyse, tab 4 |
| Off-site punt | `/analyses/{id}/rapport` | Analyse, tab 3, helemaal onderaan |
| Feitenvraag | `/profielen/{id}#feiten` | Profiel, sectie 4 |

**Zes taken, zes bestemmingen, vier schermen, twee secties van de app.** Het
dashboard is één eerlijke lijst; zodra je erop klikt, spat je uiteen. En twee van
de zes taken staan bij het *profiel* — een merk-scherm — terwijl ze het werk van
een *analyse* blokkeren.

### 1.5 Waar informatie staat die er niet hoort

| Informatie | Staat nu | Hoort bij de vraag |
|---|---|---|
| Feitenvragen (`FactRequests`) | Profielpagina | "Wat moet ik doen?" |
| Technische blokkades | Profielpagina **én** bovenaan Rapport (`AuditGate`) | "Wat moet ik doen?" |
| Concurrenten bevestigen | Profielpagina, via link vanaf `ScorePanel` | "Waar sta ik?" |
| Off-site taken | Onderaan Rapport, ná alle aanbevelingen | "Wat moet ik doen?" |
| Rapport-samenvatting | Tab 3, boven de gaten | "Hoe sta ik ervoor?" |
| Effect per pagina | Tab 1 (`ResultsPanel`) **én** tab 4 detail | "Werkte het?" |
| Prompts beheren | Tab 5, tussen de configuratie | Configuratie ✓ (klopt) |

Zeven blokken, waarvan er zes op de verkeerde plek staan of dubbel voorkomen.

---

## 2. Het voorstel: één dossier in vier hoofdstukken

**Haal de tabbalk weg. Maak van een analyse één doorlopende pagina die van boven
naar beneden het verhaal vertelt, altijd in dezelfde volgorde.**

```
  01  STAND        Hoe sta ik ervoor?      score · verandering · wat het betekent
  02  BEWIJS       Waar win en mis ik?     per vraag, met het letterlijke antwoord
  03  WERK         Wat moet ik doen?       één lijst, elke regel een taak met status
  04  RESULTAAT    Heeft het gewerkt?      effect van wat gepubliceerd is
```

**De volgorde ís de logica.** Hoofdstuk 4 voedt volgende periode hoofdstuk 1 —
de lus uit §1.1, uitgeschreven als leesrichting. Er valt niets te kiezen, dus
valt er ook niets verkeerd te kiezen.

### 2.1 Waarom scrollen beter is dan tabs — hier

Tabs zijn de juiste keuze als de secties **onafhankelijk** zijn en de gebruiker
**weet welke hij nodig heeft** (instellingen-categorieën, bijvoorbeeld). Beide
gelden hier niet: de secties bouwen op elkaar voort, en juist die volgorde is wat
de gebruiker mist. Een verticale as kan volgorde uitdrukken; een horizontale
tabrij niet.

Bijkomend voordeel: het bewijs staat direct onder de bewering. Vandaag moet
"3× aangetoond" je naar een ander tabblad sturen. Straks is het een uitklapper
ter plekke.

### 2.2 Oriëntatie zonder fragmentatie: de sectie-rail

Eén lange pagina zonder houvast is ook geen oplossing. Daarom een **sticky
sectie-rail**: genummerde mono-labels, paarse actieve markering, scroll-spy.

Dat is exact het patroon dat al in de codebase zit — `NumberedNav` in
`components/profile-menu.tsx` (het "Kies je volgende stap"-sheet): `01`, `02` in
mono/paars, paarse linkerrand op actief, chevron rechts. Dat component wordt
hergebruikt, niet uitgevonden.

- **Desktop (≥1024px):** verticale rail links naast de inhoud, sticky.
- **Tablet/mobiel:** horizontale chiprij onder de kop, sticky onder de header,
  met dezelfde nummering.

De rail toont bovendien **stand per hoofdstuk** — bij `03 WERK` een telling
("4 open"), bij een lopende meting een `live-dot`. Dat is iets wat een tabbalk
nu niet doet: je ziet in één oogopslag waar iets op je wacht.

### 2.3 Wat er met elk bestaand blok gebeurt

Niets van de inhoud gaat verloren. Alles verhuist naar het hoofdstuk waar de
vraag hoort:

| Bestaand blok | Nu | Straks |
|---|---|---|
| `ScorePanel` (score + band + verandering) | tab 1 | **01 Stand** |
| Rapport-samenvatting | tab 3 | **01 Stand** — als de duiding bij het cijfer |
| `TrendChart` | tab 1 | **01 Stand** |
| Rapport-periodekiezer | tab 3 | **01 Stand**, als periodeschakelaar voor de hele pagina |
| Concurrentiebalken (`EntityComparison`) | tab 1 | **02 Bewijs** — het is een uitkomst van de metingen |
| "Ook genoemd" + concurrenten bevestigen | tab 1 → link naar profiel | **02 Bewijs**, inline bevestigen |
| `AnswersView` (30 vragen) | tab 2 | **02 Bewijs** — de kern van dit hoofdstuk |
| "Waar je zichtbaarheid mist" (gaps) | tab 3 | **02 Bewijs** — als samenvatting bóven de vragen |
| `AuditGate` (blokkades) | tab 3, bovenaan | **03 Werk** — als taak, bovenaan |
| Aanbevelingen + `GenerateButton` | tab 3 | **03 Werk** — als taak in staat "te doen" |
| `GenerateAllButton` | tab 3 | **03 Werk**, kop van de lijst |
| `OffsitePanel` | tab 3, onderaan | **03 Werk** — als taken, tussen de rest |
| `LibraryList` (bibliotheek) | tab 4 | **blijft een eigen plek** — zie §3.3 |
| `FactRequests` | **profielpagina** | **03 Werk** — als taak |
| `ResultsPanel` | tab 1, bovenaan | **04 Resultaat** |
| Effect per pagina | tab 1 + tab 4 detail | **04 Resultaat**, één plek |
| Contentstuk lezen/bewerken/publiceren | tab 4 → detail | **subpagina** (blijft) |
| `TopicResearchEditor`, `PromptsManager`, `ContentBriefEditor`, `TrackingToggle` | tab 5 | **/instellingen** (blijft, achter tandwiel) |
| `ConfirmBar` (concept bevestigen) | tab 5, onderaan | **eigen scherm** `/concept` |

Twee blokken verlaten de profielpagina (`FactRequests`, en de blokkades die daar
gespiegeld stonden). De profielpagina wordt daarmee wat hij hoort te zijn:
**naslag over het merk**, geen werkplek.

---

## 3. Het hart: één werkmodel

Dit is de belangrijkste architectuurwijziging, en de reden dat hoofdstuk 03 werkt.

### 3.1 Het probleem in de code

Vandaag bestaat "werk" in zes vormen die niets van elkaar weten:

- `lib/dashboard.ts` leidt zes `ActionItem`s af met eigen prioriteiten
- `rapport/page.tsx` rendert aanbevelingen met een eigen generatie-knop en een
  eigen "al gegenereerd?"-check (`generatedTitles`)
- `offsite-panel.tsx` heeft een eigen statusmachine (`open/bezig/gedaan/niet_relevant`)
- `library-list.tsx` heeft een eigen oordeel (`draft/needs_review/klaar`)
- `fact-requests.tsx` heeft een eigen `open/beantwoord`
- `audit-gate.tsx` heeft blokkades zonder status

Vijf statusmachines voor één begrip. Elk met eigen woorden, eigen kleuren, eigen
volgorde. Geen wonder dat het rommelig aanvoelt: het *is* rommelig, ook in de code.

### 3.2 Eén type, één statusmachine

Nieuw bestand `lib/work.ts`:

```ts
import "server-only";

/** Wat voor werk het is. Bepaalt het icoon/label, niet de plek in de lijst. */
export type WorkKind =
  | "blokkade"    // technische audit blokkeert alles
  | "goedkeuring" // concept bevestigen, meting start daarna
  | "herstel"     // er ging iets mis
  | "feit"        // feitenvraag over het bedrijf
  | "pagina"      // aanbevolen/geschreven pagina voor de eigen site
  | "offsite";    // actie buiten de eigen site

/**
 * Waar het werk staat. DIT bepaalt de volgorde op het scherm — de gebruiker
 * groepeert niet naar soort werk, hij groepeert naar "moet ik hier iets?".
 */
export type WorkState =
  | "nu"            // actie van de klant nodig
  | "loopt"         // wij zijn ermee bezig (genereren, meten)
  | "wacht"         // gepubliceerd, we hermeten over 2-4 weken
  | "klaar";        // afgerond

export interface WorkItem {
  id: string;
  kind: WorkKind;
  state: WorkState;
  title: string;
  /** Eén zin: waarom dit ertoe doet. Geen uitleg over het systeem. */
  why: string;
  /** Lager = eerder. Binnen dezelfde state. */
  urgency: number;
  /** Waar de klant heen gaat om het te doen — vaak een subpagina of een dialog. */
  href?: string;
  /** Bewijs: de metingen waarop dit werk rust (doorklik naar hoofdstuk 02). */
  evidenceRunIds?: string[];
  analysisId: string;
  analysisName: string;
}
```

En de afleiding, één keer, voor beide schaalniveaus:

```ts
/** Voor hoofdstuk 03 van één analyse. */
export async function loadWork(db: Db, analysisId: string): Promise<WorkItem[]>;

/** Voor het dashboard: hetzelfde model, alle analyses, opgerold. */
export async function loadWorkAcross(db: Db, userId: string): Promise<WorkItem[]>;
```

`lib/dashboard.ts` wordt hierdoor een dunne wrapper rond `loadWorkAcross()` in
plaats van een tweede, parallelle waarheid. Eén plek waar staat wat urgent is.

### 3.3 Hoe hoofdstuk 03 er dan uitziet

Gegroepeerd op **staat**, niet op soort:

```
  ┌─ NU DOEN ─────────────────────────────── 3 ─┐
  │  ⛔  Je site houdt AI-assistenten buiten     │  blokkade
  │  📄  "Wat kost een dakkapel?" — pagina klaar │  pagina · klaar om te publiceren
  │  🔗  Vermelding op Trustoo aanvragen         │  offsite
  ├─ LOOPT ───────────────────────────────── 2 ─┤
  │  ✍️  "Dakkapel plaatsen" wordt geschreven    │  pagina · live-dot
  │  ✍️  "Kosten per type" wordt geschreven      │
  ├─ WACHT OP METING ─────────────────────── 1 ─┤
  │  ⏳  "Vergunning dakkapel" — sinds 3 juli    │  pagina · hermeting 17 juli
  ├─ KLAAR ───────────────────────── uitklappen ┤
  └─────────────────────────────────────────────┘
```

Eén lijst. De gebruiker leest van boven naar beneden en weet wat hij moet doen.

**De bibliotheek blijft wél een eigen plek** (beslissing van de opdrachtgever,
en terecht). `content_pieces` is twee dingen tegelijk: in het dossier is een
pagina een *taak* — hij ligt klaar, hij is gepubliceerd, hij wordt hermeten —
maar de tekst zélf is het **eindproduct** waar de klant voor betaalt. Een
eindproduct hoort een vaste kast te hebben waar het netjes bij elkaar staat,
ook lang nadat de taak eromheen is afgerond.

De tweedeling is dus: **hoofdstuk 03 zegt wat je moet dóén, de bibliotheek is
waar alles staat.** In de bibliotheek is de ordening de levensloop van een
tekst — klaar om te publiceren, nog nakijken, online, in de maak — in plaats van
één lange lijst op datum. Zo zoekt iemand zijn eigen content ook: "wat staat er
al online" is een andere vraag dan "wat moet ik nog nakijken".

Het **contentstuk zelf** heeft genoeg diepte (tekst, GEO-scorecard,
publicatie-instructies, versies, herschrijven) om een subpagina te verdienen.
Die blijft.

---

## 4. Nieuwe routestructuur

```
/analyses                             Dashboard — het werk over alle analyses heen
/analyses/[id]                        HET DOSSIER — 01 Stand · 02 Bewijs · 03 Werk · 04 Resultaat
/analyses/[id]/concept                De goedkeuringsstap (alleen bij status concept_klaar)
/analyses/[id]/bibliotheek            Het eindproduct: alle geschreven pagina's
/analyses/[id]/bibliotheek/[pieceId]  Eén contentstuk
/analyses/[id]/instellingen           Configuratie, achter het tandwiel

/analyses/[id]/rapport                → stuurt door naar het dossier
/analyses/[id]/antwoorden             → stuurt door naar hoofdstuk 02

/profielen                            Naslag over het merk (heet in de UI "Merken")
/instellingen                         Account
```

**Van 5 tabbladen naar 1 dossier + 2 vaste bestemmingen** (bibliotheek en
instellingen), plus het conceptscherm dat alleen tijdens de goedkeuring
bestaat. De oude tab-URL's blijven werken als redirect, want er staan links naar
in eerder verstuurde e-mails.

De routes heten nog `/profielen` terwijl de UI "Merken" zegt: bestaande links en
bladwijzers blijven zo werken, en wat de klant leest is wat telt.

### 4.1 Periodes

De rapport-periodekiezer (`?periode=`) wordt een **schakelaar voor de hele
pagina**, bovenaan hoofdstuk 01: "Meting van 3 juli ▾". Alle vier de hoofdstukken
tonen dan diezelfde periode. Vandaag kan de gebruiker een oud rapport bekijken
terwijl het tabblad ernaast de nieuwste score toont — twee periodes tegelijk op
één analyse, zonder dat iets dat aangeeft.

---

## 5. Waarom dit InSpace-eigener is, niet minder

De opdracht is de vormgeving van InSpace handhaven. Het voorstel raakt **geen
enkel token**: geen nieuwe kleur, geen nieuw font, geen nieuwe radius, geen
nieuwe easing. `globals.css` §A/§B blijft zoals het is.

Sterker: **de tabbalk is op dit moment het minst InSpace-achtige element in de
app.** InSpace's eigen vormtaal is een lange, gelaagde scroll met sticky
navigatie, genummerde secties, grote sectiekoppen met één gradient-woord, ambient
glow-orbs tussen de secties door en gekleurde elevatie. Precies wat §A3 van
`designsystem.md` beschrijft. Een generieke tabrij met een 2px onderstreping is
daar de tegenpool van — dat is standaard-dashboard-meubilair.

Het herontwerp gebruikt de bestaande signatuur juist zwaarder:

| InSpace-element | Waar het in het dossier terugkomt |
|---|---|
| Genummerde mono-navigatie (`01`, `02`) | De sectie-rail — hergebruik van `NumberedNav` |
| Grote kop met één gradient-woord | Elke hoofdstukkop: "Waar je **mist**" |
| Glow-orbs als sectie-scheiding | Tussen de hoofdstukken, zeer subtiel |
| Sticky glassmorphism-balk | De rail op mobiel (`backdrop-blur`, al in `AppShell`) |
| `live-dot` = autonoom actief | In de rail bij een lopende meting, en bij "Loopt"-taken |
| Pil-chips, mono, uppercase | De staat-koppen in hoofdstuk 03 |
| Gekleurde elevatie i.p.v. harde randen | De "nu doen"-taak krijgt paarse gloed i.p.v. een paarse rand |

Netto: minder generiek app-meubilair, meer merk.

---

## 6. Concrete code

### 6.1 De sectie-rail

```tsx
// components/section-rail.tsx
"use client";

import { useEffect, useState } from "react";

export interface Section {
  id: string;
  label: string;
  /** Bv. "4 open" of "meting loopt" — de stand van dit hoofdstuk. */
  badge?: string;
  live?: boolean;
}

export function SectionRail({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  // Scroll-spy: het hoofdstuk dat het dichtst bij de bovenkant staat, wint.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Hoofdstukken"
      className="sticky top-20 hidden w-48 shrink-0 flex-col gap-1 self-start lg:flex"
    >
      {sections.map((s, i) => {
        const on = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={on ? "true" : undefined}
            className="flex items-baseline gap-3 py-2.5 transition-colors"
            style={{
              borderLeft: on ? "2px solid var(--accent-purple)" : "2px solid var(--border-subtle)",
              paddingLeft: 14,
            }}
          >
            <span
              className="mono-label"
              style={{ color: on ? "var(--accent-purple)" : "var(--text-muted)", fontSize: "0.7rem" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex flex-col gap-0.5">
              <span
                className="text-sm font-medium transition-colors"
                style={{ color: on ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {s.label}
              </span>
              {s.badge && (
                <span className="mono-label flex items-center gap-1.5" style={{ fontSize: "0.62rem" }}>
                  {s.live && <span className="live-dot" style={{ width: 6, height: 6 }} />}
                  {s.badge}
                </span>
              )}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
```

Mobiel (`< lg`) dezelfde `sections`-array als horizontale chiprij, sticky onder
de header — één extra component van ~30 regels, of een variant van dit component
met `lg:hidden` en `flex-row overflow-x-auto`.

### 6.2 De dossierpagina

```tsx
// app/analyses/[id]/page.tsx
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { phaseOf } from "@/lib/analysis-phase";
import { SectionRail } from "@/components/section-rail";
import { Chapter } from "@/components/chapter";
import { StandChapter } from "./chapters/stand";
import { BewijsChapter } from "./chapters/bewijs";
import { WerkChapter } from "./chapters/werk";
import { ResultaatChapter } from "./chapters/resultaat";
import { ChapterSkeleton } from "@/components/skeleton";

export default async function DossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string }>;
}) {
  const { id } = await params;
  const { periode } = await searchParams;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  // De goedkeuring is een eigen scherm, geen hoofdstuk: één taak, geen afleiding.
  if (phaseOf(analysis) === "goedkeuren") redirect(`/analyses/${id}/concept`);

  const period = periode != null ? Number(periode) : null;

  return (
    <div className="flex gap-10">
      <SectionRail
        sections={[
          { id: "stand", label: "Stand" },
          { id: "bewijs", label: "Waar je mist" },
          { id: "werk", label: "Wat je moet doen" },
          { id: "resultaat", label: "Wat het opleverde" },
        ]}
      />

      {/* Elk hoofdstuk streamt los binnen: de score staat er terwijl het
          bewijs nog laadt. Vandaag blokkeert de hele pagina op alle queries. */}
      <div className="flex min-w-0 flex-1 flex-col gap-16">
        <Chapter id="stand" number="01" title="Hoe je" accent="ervoor staat">
          <Suspense fallback={<ChapterSkeleton />}>
            <StandChapter analysis={analysis} period={period} />
          </Suspense>
        </Chapter>

        <Chapter id="bewijs" number="02" title="Waar je wint" accent="en mist">
          <Suspense fallback={<ChapterSkeleton />}>
            <BewijsChapter analysis={analysis} period={period} />
          </Suspense>
        </Chapter>

        <Chapter id="werk" number="03" title="Wat je nu" accent="moet doen">
          <Suspense fallback={<ChapterSkeleton />}>
            <WerkChapter analysis={analysis} />
          </Suspense>
        </Chapter>

        <Chapter id="resultaat" number="04" title="Wat het heeft" accent="opgeleverd">
          <Suspense fallback={<ChapterSkeleton />}>
            <ResultaatChapter analysis={analysis} />
          </Suspense>
        </Chapter>
      </div>
    </div>
  );
}
```

### 6.3 De hoofdstukkop — InSpace's signatuur

```tsx
// components/chapter.tsx
export function Chapter({
  id, number, title, accent, children,
}: {
  id: string;
  number: string;
  title: string;
  /** Het woord dat de merk-gradient krijgt — InSpace's vingerafdruk. */
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-24">
      {/* Ambient orb per hoofdstuk (designsystem.md §A3) — zeer subtiel. */}
      <div
        className="glow-orb"
        style={{ width: 300, height: 300, top: -80, right: -120, background: "rgba(133,17,217,0.07)" }}
      />
      <header className="relative z-10 mb-6 flex flex-col gap-1">
        <span className="mono-label" style={{ color: "var(--accent-purple)" }}>
          {number}
        </span>
        <h2 className="text-3xl font-bold tracking-tight">
          {title} <span className="brand-gradient-text">{accent}</span>
        </h2>
      </header>
      <div className="relative z-10 flex flex-col gap-4">{children}</div>
    </section>
  );
}
```

### 6.4 Streaming: sneller dan nu, niet trager

Zorg die terecht is bij "alles op één pagina": wordt dat niet traag? **Nee — het
wordt sneller.** Vandaag blokkeert `rapport/page.tsx` op zeven sequentiële/
parallelle queries voordat er één byte HTML verstuurd wordt, zonder `loading.tsx`
als vangnet. Met `<Suspense>` per hoofdstuk streamt de score binnen zodra die er
is, terwijl de rest nog draait. De gebruiker ziet eerder iets, niet later.

---

## 7. Migratiepad

Het herontwerp is groot, maar niet risicovol als je het in deze volgorde doet.
Elke stap is los te releasen en laat de app werkend achter.

| Fase | Wat | Waarom eerst | Moeite |
|---|---|---|---|
| **1** | `lib/work.ts` + `loadWork()`/`loadWorkAcross()`; `lib/dashboard.ts` erop herbouwen | Puur backend, geen UI-wijziging, maar het fundament voor hoofdstuk 03 | ~4u |
| **2** | `loading.tsx`/`error.tsx`/`not-found.tsx` + skeletons (B5 uit review 1) | Nodig voor het streaming-model; los waardevol | ~1u |
| **3** | `/concept` als eigen scherm; review-gate uit het instellingen-tabblad | Grootste conversiewinst, kleinste ingreep, onafhankelijk van de rest | ~2u |
| **4** | `Chapter` + `SectionRail`; hoofdstuk **01 Stand** en **04 Resultaat** samenstellen uit bestaande panelen | Tabs 1 en 3 gedeeltelijk samengevoegd; nog náást de tabbalk te draaien | ~4u |
| **5** | Hoofdstuk **02 Bewijs**: `AnswersView` + gaps + concurrenten samen; tab "Vragen & antwoorden" vervalt | Heft de zelf-linkende scheiding op | ~4u |
| **6** | Hoofdstuk **03 Werk** op `WorkItem`; bibliotheek als plek vervalt, `/pagina/[pieceId]` blijft | De grootste, en pas mogelijk ná fase 1 | ~8u |
| **7** | Tabbalk weg, routes hernoemen, redirects van oude URL's | Afronding | ~2u |
| **8** | Hygiëne uit review 1: B1, B2, B3, B6, B7 | Nu op de nieuwe structuur, dus in één keer goed | ~5u |

Na fase 4 draait het dossier al naast de bestaande tabs — je kunt het dan zelf
gebruiken en beslissen of de rest doorgaat, zonder iets te hebben weggegooid.

---

## 8. Status

Alle acht fases zijn gebouwd. De twee openstaande beslissingen zijn beantwoord:

1. **De bibliotheek blijft een eigen plek** — het is een eindproduct, geen
   takenlijst die zich als archief voordoet. Zie §3.3.
2. **Alles in één keer**, in acht releasebare stappen.

Wat nog aandacht verdient nu het staat:

- **De woorden van de hoofdstukkoppen.** "Hoe je ervoor staat", "Waar je wint
  en mist", "Wat je nu moet doen", "Wat het heeft opgeleverd" — dat leest
  beter op het scherm dan in een document, en is met één regel per kop aan te
  passen in `app/(app)/analyses/[id]/page.tsx`.
- **De term "Merken".** De UI zegt het nu overal; de routes en de database
  spreken nog van profielen. Dat mag zo blijven, maar als je een ander woord
  wilt, staat het op één plek (`lib/nav.ts` plus de schermteksten).
- **Doormeten met echte data.** De hoofdstukken zijn gebouwd op de bestaande
  queries, maar hoe lang hoofdstuk 02 wordt bij dertig vragen, en of de rail
  dan nog genoeg houvast geeft, blijkt pas met een gevulde analyse.
