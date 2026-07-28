# UX- & architectuuranalyse — GEO Tracker

*Senior Product Designer / Frontend Architect review, juli 2026. Basis: `main`.*

**Stack zoals aangetroffen:** Next.js App Router (RSC-first), Tailwind v4 met
`@theme inline` tokens in `app/globals.css`, Supabase (auth + data), server
actions voor auth, `fetch`-calls naar eigen `/api/*` routes voor de rest.
Alle voorstellen hieronder blijven binnen die stack — geen nieuwe
afhankelijkheden, geen state-library, geen CSS-in-JS.

---

## A. Macro-analyse

### Wat er goed zit

1. **De inhoudelijke laag is sterk.** `ActionList` (één actielijst over alle
   analyses heen), `ScorePanel` (één hoofdgetal + bandbreedte + eerlijk "gelijk
   gebleven"), `ResultsPanel` (controlegroep náást het resultaat), `ErrorNotice`
   (mensentaal boven, techniek weggevouwen), `WorkInProgress` (stappen die niet
   terugspringen). Dit is beter doordacht dan wat je in dit type product
   gemiddeld ziet. Het probleem zit niet in wát er getoond wordt.
2. **De datalaag is netjes gescheiden.** `lib/pipeline/*`, `lib/dashboard.ts`,
   `lib/analyses.ts` — pages zijn dun, RSC doet het zware werk. Dat maakt de
   herstructurering hieronder goedkoop: bijna alles is schermwerk.
3. **Eén design-taal is aanwezig.** `globals.css` heeft een compleet token-set
   (kleur, radius, motion, typografie) en primitieven (`.card`, `.btn-*`,
   `.chip`, `.field`, `.mono-label`). De basis is er; hij wordt alleen niet
   consequent gebruikt.

### De 3 grootste strategische knelpunten

#### 1. De informatiestructuur vertelt niet welk product dit is

Er zijn twee objecttypen — **Klantprofiel** (merk, eenmalig onderzoek) en
**Analyse** (één onderwerp binnen dat merk) — en de navigatie legt hun relatie
nergens uit. Sterker: van de vier links in de hoofdnavigatie wijzen er **twee
naar dezelfde route**:

```tsx
// components/app-shell.tsx:32-37
<Link href="/profielen">Klantprofielen</Link>
<Link href="/profielen">Mijn bedrijfsgegevens</Link>   // ← zelfde bestemming
```

Hetzelfde staat in `components/profile-menu.tsx` (regel 34, 38), daar netjes
verdeeld over twee koppen ("Navigatie" / "Account") — wat de suggestie versterkt
dat het om twee verschillende dingen gaat. En beide lijstpagina's dragen
dezelfde `<h1>`: **"Overzicht"**. Wie op `/profielen` staat, ziet dus letterlijk
hetzelfde kopje als op `/analyses`.

Daar bovenop: de desktopnavigatie heeft **geen actieve staat**. Vier identieke
`mono-label`-links, geen enkele markering van waar je bent. Het mobiele menu
heeft die markering wél (paarse linkerrand + kleur). De "waar ben ik"-vraag is
op het grootste scherm het slechtst beantwoord.

#### 2. De levenscyclus van een analyse is vier keer los geïmplementeerd

Een analyse doorloopt `bezig → concept_klaar → meten → gemeten → gereed`
(met `mislukt` dwars daaroverheen). Elk tabblad leidt die toestand **zelf**
opnieuw af en verzint zijn eigen boodschap:

| Bestand | Wat het doet |
|---|---|
| `app/analyses/[id]/page.tsx:33-59` | `determineStage()` + eigen routing naar 3 voortgangsschermen + eigen "Concept klaar"-kaart |
| `app/analyses/[id]/rapport/page.tsx:38-72` | eigen `status`-switch met 4 aparte `EmptyState`s + eigen `determineStage()` |
| `app/analyses/[id]/antwoorden/page.tsx:35-40` | eigen "nog geen antwoorden" |
| `app/analyses/[id]/bibliotheek/page.tsx:31-38` | eigen "bibliotheek is leeg" |

Het gevolg voor de gebruiker: **de tabs liegen**. Alle vijf zien er altijd even
klikbaar uit, maar drie ervan zijn tijdens `bezig` niets dan een tekstje dat je
terugstuurt naar Overzicht. Je leert de app kennen door tegen doodlopende wegen
aan te lopen. De navigatie weet wél in welke fase de analyse zit — dat staat in
`analysis.status`, één laag boven de tabs in `layout.tsx` — maar geeft het niet
door.

Het gevolg voor de code: elke nieuwe status betekent vier bestanden aanpassen.

#### 3. Er is geen enkele systeem-feedback op routeniveau

```
$ find app -name "loading.tsx" -o -name "error.tsx" -o -name "not-found.tsx"
(niets)
```

Nul. In een App-Router-app waarin `/analyses` vier Supabase-queries doet,
`/analyses/[id]` er zes doet en `/analyses/[id]/rapport` er zeven — allemaal
server-side, allemaal vóór de eerste byte HTML. Tussen klik en nieuw scherm
gebeurt er **niets zichtbaars**: geen skeleton, geen spinner, geen
voortgangsbalk. De app voelt traag terwijl hij dat waarschijnlijk niet is.

En als er wél iets misgaat: `notFound()` staat op zes plekken, maar er is geen
`not-found.tsx` — dus krijgt de gebruiker de kale Next.js-standaardpagina,
buiten de AppShell om, in het Engels. Een onverwachte fout in een RSC geeft
hetzelfde: de standaard-errorpagina, terwijl er een prima `ErrorNotice`-component
klaarligt die nergens op routeniveau gebruikt wordt.

---

## B. Verbetervoorstellen per flow

---

### B1 · Globale navigatie & informatiestructuur

**Huidige situatie & knelpunt**
Vier links, twee bestemmingen. Geen actieve staat op desktop. Twee lijstpagina's
met dezelfde `<h1>`. Twee losse navigatie-definities (`app-shell.tsx` inline,
`profile-menu.tsx` als constanten) die uit elkaar gaan lopen zodra iemand er één
aanpast. Accountzaken (e-mail, uitloggen) staan op desktop uitgestald ín de
navigatiebalk en concurreren daar visueel met de inhoudelijke links.

**UX/UI-verbetervoorstel**
Twee bestemmingen, niet vier. **Analyses** en **Merken** zijn het werk;
account is geen bestemming maar een la. Waarom: navigatie is een *belofte over
de omvang van het product*. Vier items suggereren vier plekken; als twee ervan
hetzelfde blijken, verliest de gebruiker vertrouwen in de rest van de balk.

Concreet:
- Eén gedeelde `NAV`-constante, gebruikt door desktop én mobiel.
- Actieve staat op beide: de sectie waar je bent is gemarkeerd.
- E-mail + Instellingen + Uitloggen achter het profiel-icoon, óók op desktop
  (het icoon bestaat al, het is nu `sm:hidden`).
- Hernoem "Klantprofielen" → **"Merken"**. "Klantprofiel" is bureau-jargon;
  voor de ondernemer die zijn eigen merk meet is het gewoon zijn merk. Dit
  verklaart meteen waarom het tweede item ("Mijn bedrijfsgegevens") ooit
  toegevoegd is — het was een poging hetzelfde uit te leggen aan een andere
  doelgroep. Eén woord, en die tweede link is niet meer nodig.
- Geef de lijstpagina's hun eigen `<h1>`: "Analyses" en "Merken", niet 2× "Overzicht".

**Concrete code-aanpassing**

Nieuw bestand `lib/nav.ts` — één bron voor beide menu's:

```ts
export interface NavItem {
  href: string;
  label: string;
}

/** De twee plekken waar het werk gebeurt. */
export const NAV: NavItem[] = [
  { href: "/analyses", label: "Analyses" },
  { href: "/profielen", label: "Merken" },
];

/** Account — achter het profielmenu, geen hoofdnavigatie. */
export const ACCOUNT_NAV: NavItem[] = [
  { href: "/instellingen", label: "Mijn instellingen" },
];

/** Actief = deze route of een subroute ervan. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

`components/app-shell.tsx` — nav wordt een client-component met actieve staat,
de shell blijft server:

```tsx
// components/main-nav.tsx (nieuw, client)
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "@/lib/nav";

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="mono-label rounded-[var(--radius-pill)] px-3 py-1.5 transition-colors"
            style={{
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "var(--bg-elevated)" : "transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

```tsx
// components/app-shell.tsx — de balk wordt drie elementen breed i.p.v. acht
<div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
  <Link href="/analyses" className="text-lg font-bold tracking-tight">
    <span className="brand-gradient-text">GEO Tracker</span>
  </Link>
  <MainNav />
  {/* niet meer sm:hidden — account zit op élk formaat achter het icoon */}
  <ProfileMenu email={user.email ?? ""} signOutAction={signOut} />
</div>
```

In `components/profile-menu.tsx`: `NAV_LINKS`/`ACCOUNT_LINKS` vervangen door de
import uit `lib/nav.ts`, en `sm:hidden` weghalen op de knop (regel 140) en op de
sheet (regel 155). Het full-screen sheet mag op desktop een gecentreerd paneel
worden, of blijf bij full-screen — dat past bij het karakter van de app.

---

### B2 · Eerste keer: de omweg naar de eerste meting

**Huidige situatie & knelpunt**
Een nieuwe gebruiker landt via `app/page.tsx` → `/analyses` → lege staat:

> **Nog geen analyses** … *[Start je eerste analyse]* → `/analyses/new`

en komt dáár aan bij:

> **Eerst een klantprofiel nodig** … *[Klantprofiel aanmaken]* → `/profielen/nieuw`

**Drie schermen en twee CTA's voordat de eerste echte stap begint** — en de
eerste CTA was een belofte die de app niet kon nakomen. Dat is precies de fout
die de onboarding zelf zo zorgvuldig vermijdt (zie de "waarde vóór
inspanning"-toelichting boven `onboarding-wizard.tsx`): eerst vragen, dan pas
laten zien. Hier gebeurt het omgekeerde in de navigatie.

**UX/UI-verbetervoorstel**
De lege staat van `/analyses` weet of er profielen zijn. Bestaat er nog geen
merk, dan is de eerste stap *een merk aanmaken* — dat moet de knop zeggen, en de
knop moet daar direct heen. De tussenpagina verdwijnt uit de flow (de route
blijft bestaan voor wie er via een link belandt).

Waarom: een lege staat is de belangrijkste onboarding-pagina die je hebt. Hij
mag maar één ding doen — de volgende échte stap starten — en die stap mag geen
tussenstop kennen.

**Concrete code-aanpassing**

```tsx
// app/analyses/page.tsx
const [dashboard, { count: profileCount }] = await Promise.all([
  loadDashboard(supabase, user.id),
  supabase.from("profiles").select("id", { count: "exact", head: true }),
]);
const hasProfile = (profileCount ?? 0) > 0;
```

```tsx
// lege staat — één CTA, die klopt
{analyses.length === 0 ? (
  <EmptyState
    title={hasProfile ? "Nog geen analyses" : "Welkom — begin met je merk"}
    action={
      hasProfile
        ? { href: "/analyses/new", label: "Start je eerste analyse" }
        : { href: "/profielen/nieuw", label: "Merk toevoegen" }
    }
  >
    {hasProfile
      ? "Kies een merk en het product of onderwerp dat je wilt meten."
      : "We onderzoeken je merk één keer grondig — daarna meet je er onbeperkt onderwerpen op. Duurt ongeveer een minuut."}
  </EmptyState>
) : ( … )}
```

En de `+ Nieuwe analyse starten`-knop rechtsboven (regel 42) verbergen zolang
`!hasProfile` — of hem naar `/profielen/nieuw` laten wijzen. Nu leidt hij naar
een doodlopende pagina.

Zelfde patroon voor de "Start je eerste analyse"-knop; nu wijzen beide knoppen
op die pagina naar dezelfde doodlopende route.

---

### B3 · Onboarding-wizard: één stap te veel, twee namen voor één ding

**Huidige situatie & knelpunt**
De grondgedachte is goed (2 velden → starten, of vrijwillig 4 extra stappen).
Drie dingen wringen:

1. **Stap 5 ("Kennis & techniek") bevat één optioneel veld**: `sitemap_url`
   (`onboarding-wizard.tsx:399-414`). Een volledige stap, met terug/volgende-knop
   en een voortgangsbalk die daarvoor een kwart opschuift, voor één optioneel
   invoerveld dat vrijwel niemand paraat heeft.
2. **Terminologie schuift binnen één scherm**: `<h1>` zegt "Nieuw
   klantprofiel", de knop op stap 1 zegt "Start het onderzoek", de knop op de
   laatste stap zegt "Bedrijfsprofiel opslaan". Drie namen (klantprofiel /
   onderzoek / bedrijfsprofiel) voor één handeling.
3. **Twee knoppen van verschillende hoogte onder elkaar**: `.btn-primary` is
   52px, `.btn-outline` 44px (`globals.css:149` vs `:192`). Als
   "gelijkwaardige keuze" bedoeld, maar ze zíjn niet gelijkwaardig opgemaakt —
   ze zijn 8px uit elkaar en dat leest als slordigheid, niet als hiërarchie.

**UX/UI-verbetervoorstel**
- Sitemap-veld naar stap 4 (Doelgroep & stijl → hernoemen naar "Doelgroep,
  stijl & techniek"), of eerlijker: naar de profielpagina onder "Technische
  controle", waar het thuishoort. Vier stappen worden drie.
- Eén naam. Kies er één en gebruik hem overal — in lijn met B1: **"merk"**.
  `<h1>` "Nieuw merk", knop "Start het onderzoek" (stap 1) en "Opslaan en
  onderzoek starten" (laatste stap) — dezelfde handeling, herkenbaar bewoord.
- Knophoogte gelijktrekken (zie B6).

**Concrete code-aanpassing**

```tsx
// onboarding-wizard.tsx
const STEP_TITLES = ["Bedrijf", "Wat je doet", "Markt & concurrentie", "Doelgroep & stijl"];
```

Het `sitemap_url`-blok (`step === 4`) verplaatsen naar het `step === 3`-blok als
laatste veld. `isStepValid` heeft geen `case 4` meer nodig; `isLast` klopt dan
automatisch (`step === 3`).

```tsx
// laatste knop — zelfde werkwoord als op stap 1
{pending ? "Onderzoek starten…" : "Opslaan en onderzoek starten"}
```

---

### B4 · Analyse-detail: van 5 tabs naar 3 + fase-bewuste navigatie

**Huidige situatie & knelpunt**
Vijf tabs, waarvan er tijdens de eerste 5–10 minuten van een analyse **vier
leeg** zijn. En de belangrijkste handeling van de hele flow — het goedkeuren van
het concept, waar de app op de klant staat te wachten — is weggestopt
**onderaan het tabblad "Instellingen"**, na vijf kaarten scrollen
(`instellingen/page.tsx:100-117`). De Overzicht-tab kan er alleen naar
verwijzen met een kaart die zegt "ga naar het tabblad Instellingen"
(`page.tsx:47-58`).

Dat is de kern: *een verplichte stap in de gebruikersreis staat vermomd als een
configuratiescherm*. "Instellingen" is de universele naam voor "hier hoef je
niet te zijn". Daar de enige blokkerende actie in verstoppen kost conversie.

**UX/UI-verbetervoorstel**

1. **Bepaal de fase één keer, in de layout.** `layout.tsx` haalt de analyse al
   op; laat hem de fase afleiden en doorgeven aan de tabs.
2. **Tabs weerspiegelen de fase.** Tabs zonder inhoud zijn zichtbaar maar
   uitgeschakeld (`aria-disabled`, gedempt, niet klikbaar) — de gebruiker ziet
   wát er komt zonder erin te kunnen vallen. Het tabblad dat om actie vraagt
   krijgt de `live-dot` die al in het design system zit.
3. **Instellingen uit de tabrij.** Vijf tabs waarvan één configuratie is, is
   één te veel; configuratie is geen inhoud. Zet het als tandwiel-link rechts
   naast de tabrij (zelfde regel, uitgelijnd rechts).
4. **De goedkeuring wordt een eigen fase, geen tab.** Bij
   `status === "concept_klaar"` toont de layout een **doelgerichte
   review-weergave** in plaats van de tabrij: onderwerp-onderzoek, prompts,
   brief, en de `ConfirmBar` bovenaan verankerd. Eén scherm, één taak, geen
   tabs die afleiden. Na bevestiging keert de normale tabrij terug.

Netto: van 5 tabs → **3** (Overzicht · Rapport · Bibliotheek) plus
"Vragen & antwoorden" als vierde zodra er antwoorden zíjn, plus een tandwiel.
En de review-gate is niet meer te missen.

**Concrete code-aanpassing**

Nieuw: `lib/analysis-phase.ts`

```ts
import type { Analysis } from "@/lib/types/database";

export type Phase = "voorbereiden" | "goedkeuren" | "meten" | "rapporteren" | "klaar";

export function phaseOf(analysis: Analysis): Phase {
  switch (analysis.status) {
    case "concept_klaar": return "goedkeuren";
    case "meten":         return "meten";
    case "gemeten":       return "rapporteren";
    case "gereed":        return "klaar";
    default:              return "voorbereiden"; // bezig | mislukt
  }
}

/** Welke tabs hebben in deze fase iets te tonen? */
export function availableTabs(phase: Phase): Record<string, boolean> {
  const measured = phase === "rapporteren" || phase === "klaar";
  return {
    "":             true,
    "antwoorden":   measured,
    "rapport":      phase === "klaar",
    "bibliotheek":  phase === "klaar",
  };
}
```

`app/analyses/[id]/tabs.tsx`:

```tsx
const TABS = [
  { segment: "", label: "Overzicht" },
  { segment: "antwoorden", label: "Vragen & antwoorden" },
  { segment: "rapport", label: "Rapport" },
  { segment: "bibliotheek", label: "Bibliotheek" },
];

export function AnalysisTabs({ analysisId, phase }: { analysisId: string; phase: Phase }) {
  const pathname = usePathname();
  const base = `/analyses/${analysisId}`;
  const enabled = availableTabs(phase);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)]">
      <nav className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = pathname === href;
          const open = enabled[tab.segment];

          if (!open) {
            return (
              <span
                key={tab.segment || "overzicht"}
                aria-disabled="true"
                title="Beschikbaar zodra de meting klaar is"
                className="cursor-not-allowed whitespace-nowrap px-4 py-3 text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {tab.label}
              </span>
            );
          }
          return (
            <Link key={tab.segment || "overzicht"} href={href} /* … ongewijzigd … */>
              {tab.label}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                               style={{ background: "var(--brand-gradient)" }} />}
            </Link>
          );
        })}
      </nav>

      {/* Configuratie is geen inhoud — dus geen tab. */}
      <Link
        href={`${base}/instellingen`}
        aria-label="Instellingen van deze analyse"
        className="mono-label shrink-0 px-3 py-3 transition-colors hover:text-[var(--text-primary)]"
      >
        ⚙︎ Instellingen
      </Link>
    </div>
  );
}
```

`app/analyses/[id]/layout.tsx` — de review-gate krijgt zijn eigen weergave:

```tsx
const phase = phaseOf(analysis);

return (
  <div className="flex flex-col gap-6">
    <PageHeader
      backHref="/analyses"
      backLabel="Analyses"
      title={analysis.name}
      aside={<StatusBadge status={analysis.status} />}
    />

    {phase === "goedkeuren" ? (
      // Eén taak, geen tabs: de klant moet hier het concept bevestigen.
      <ReviewGateShell analysisId={id}>{children}</ReviewGateShell>
    ) : (
      <>
        <AnalysisTabs analysisId={id} phase={phase} />
        <div>{children}</div>
      </>
    )}
  </div>
);
```

en in `app/analyses/[id]/page.tsx` vervalt het `concept_klaar`-blok
(regel 46-58) plus de bijbehorende `Link`-import: de layout regelt dit nu.
`redirect()` naar `/instellingen` bij `phase === "goedkeuren"` in
`page.tsx` is het alternatief als je `ReviewGateShell` niet wilt bouwen —
één regel, en de gebruiker landt direct waar hij moet zijn:

```tsx
if (analysis.status === "concept_klaar") redirect(`/analyses/${id}/instellingen`);
```

Tot slot in `instellingen/page.tsx`: de `ConfirmBar` van de bodem naar de top
verplaatsen wanneer `isReviewGate` — de actie hoort boven het materiaal dat je
beoordeelt, niet achter vijf kaarten scrollen. Of laat hem sticky onderin
staan (`position: sticky; bottom: 0`), dat past bij het bestaande
`max-w-5xl`-blok in `confirm-bar.tsx:41`.

---

### B5 · Systeem-feedback op routeniveau (loading / error / not-found)

**Huidige situatie & knelpunt**
Geen enkele `loading.tsx`, `error.tsx` of `not-found.tsx` in de hele app. Elke
navigatie naar een RSC-pagina met 4–7 database-queries geeft een dood interval
zonder feedback. `notFound()` (6×) levert de kale Next.js-pagina buiten de
AppShell. Een exception in een server component idem — terwijl `ErrorNotice`
er al ligt.

**UX/UI-verbetervoorstel**
Drie kleine bestanden per sectie, gebouwd op wat er al is. Skeletons in plaats
van spinners: een skeleton communiceert *waar* de inhoud komt, een spinner alleen
*dat* er gewacht wordt. Vorm van de skeleton = vorm van de kaarten die eronder
komen, met de bestaande tokens.

**Concrete code-aanpassing**

`components/skeleton.tsx` (nieuw):

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Lijstpagina's: kop + drie kaartregels. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-10 w-52 rounded-[var(--radius-md)]" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  );
}
```

In `globals.css`, bij de primitieven:

```css
/* Skeleton — dezelfde vlakken en easing als de rest van het systeem. */
.skeleton {
  background: linear-gradient(90deg,
    var(--bg-elevated) 25%, var(--bg-surface-2) 50%, var(--bg-elevated) 75%);
  background-size: 200% 100%;
  animation: skeleton-sweep 1.4s infinite var(--ease-standard);
}
@keyframes skeleton-sweep {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: var(--bg-elevated); }
}
```

Dan per sectie:

```tsx
// app/analyses/loading.tsx  (en identiek app/profielen/loading.tsx)
import { ListSkeleton } from "@/components/skeleton";
export default function Loading() { return <ListSkeleton />; }
```

```tsx
// app/analyses/[id]/loading.tsx — de tabrij staat al in de layout, dus alleen inhoud
import { Skeleton } from "@/components/skeleton";
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
      <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
    </div>
  );
}
```

```tsx
// app/error.tsx — client component, verplicht in App Router
"use client";
import { ErrorNotice } from "@/components/error-notice";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <ErrorNotice
        error={{
          kind: "unknown",
          title: "Er ging iets mis bij het laden",
          message: "Probeer het opnieuw. Blijft het misgaan, laat het ons dan weten.",
          canRetry: true,
          detail: error.message,
        }}
        onRetry={reset}
      />
    </div>
  );
}
```

```tsx
// app/not-found.tsx
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <EmptyState
        title="Deze pagina bestaat niet"
        action={{ href: "/analyses", label: "Naar je analyses" }}
      >
        De link klopt niet meer, of het item is verwijderd.
      </EmptyState>
    </div>
  );
}
```

Kosten: ~60 regels. Effect op de waargenomen snelheid: groot — dit is het
goedkoopste punt op de hele lijst.

---

### B6 · Component-inconsistenties: het systeem bestaat, maar wordt omzeild

Vijf concrete afwijkingen, alle vijf op één plek op te lossen.

#### 1. `.card` doet alsof alles klikbaar is

```css
/* globals.css:139-142 — geldt voor ALLE 72 .card-gebruiken */
.card:hover {
  border-color: rgba(11, 11, 12, 0.16);
  box-shadow: 0 14px 34px rgba(11, 11, 12, 0.08);
}
```

Een kaart die 34px omhoog schaduwt bij hover belooft interactie. Van de 72
kaarten zijn er hooguit acht daadwerkelijk klikbaar (de lijstitems op
`/analyses` en `/profielen`). De overige 64 — score, rapport, samenvatting,
foutmeldingen, wachtschermen — liften mee zonder ergens heen te gaan.

```css
/* Statisch is de standaard; liften doe je alleen als je klikbaar bent. */
.card {
  /* … ongewijzigd, maar zonder :hover-regel … */
}
.card-interactive {
  cursor: pointer;
  transition:
    box-shadow var(--duration-base) var(--ease-standard),
    border-color var(--duration-base) var(--ease-standard);
}
.card-interactive:hover {
  border-color: rgba(11, 11, 12, 0.16);
  box-shadow: 0 14px 34px rgba(11, 11, 12, 0.08);
}
```

Dan `className="card card-interactive …"` op de twee lijst-`Link`s
(`app/analyses/page.tsx:74`, `app/profielen/page.tsx:59`) — daar kan meteen het
overbodige `hover:cursor-pointer` weg, dat op een `<a>` sowieso al geldt.

#### 2. Knophoogtes lopen 8px uit elkaar

`.btn-primary` = 52px, `.btn-outline` = 44px, `.btn-green` = 52px (en `.btn-green`
wordt **nergens** gebruikt — dode CSS). Overal waar ze naast of onder elkaar
staan (onboarding stap 1, rapportpagina, profielpagina) is dat zichtbaar.

```css
/* Eén hoogte-schaal: 48px normaal, 40px compact. */
.btn-primary, .btn-outline { height: 48px; padding: 0 24px; }
.btn-sm { height: 40px; padding: 0 18px; font-size: 0.9375rem; }
```

En `.btn-green` verwijderen, of gaan gebruiken als de gedachte was dat de
groene pil de "positieve afronding"-CTA is (publiceren, bevestigen). Nu is het
alleen gewicht in het bestand.

#### 3. Eén "chip met een tint" is 30 keer met de hand nagebouwd

Ik telde **30 inline `style`-objecten** met hardgecodeerde `rgba()`-waarden
verspreid over 17 bestanden — allemaal varianten van hetzelfde: een chip of een
kaartrand met een status-tint. Twee van de gebruikte kleuren staan **niet in het
token-set**:

- `rgba(165,120,240, …)` — 8× gebruikt, ≈ `#a578f0`. De echte accentkleur is
  `#8511d9` = `rgb(133,17,217)`. Dit is een andere paars.
- `rgba(229,72,77, …)` — 2× (`analyses/[id]/page.tsx:136`,
  `instellingen/page.tsx:108`), terwijl `--status-error` = `#d33a3f` =
  `rgb(211,58,63)` is. Twee roden die nét verschillen, op schermen die de
  gebruiker na elkaar ziet.

Los dit op met tint-varianten in CSS, zodat er geen `style`-object meer nodig is:

```css
/* Chip-tinten — één definitie, overal dezelfde kleur. */
.chip-success { background: rgba(46,158,80,0.1);  color: #1f7a3d;
                border-color: rgba(46,158,80,0.3); }
.chip-danger  { background: rgba(211,58,63,0.1);  color: #c2282d;
                border-color: rgba(211,58,63,0.3); }
.chip-warning { background: rgba(240,180,60,0.12); color: #8a6100;
                border-color: rgba(240,180,60,0.35); }
.chip-neutral { background: rgba(11,11,12,0.05);   color: var(--text-muted);
                border-color: var(--border-subtle); }

/* Kaart-accenten — vervangt de losse borderColor-overrides. */
.card-accent { border-color: color-mix(in srgb, var(--accent-purple) 35%, transparent); }
.card-danger { border-color: color-mix(in srgb, var(--status-error)  40%, transparent); }
.card-success{ border-color: color-mix(in srgb, var(--status-success)40%, transparent); }
```

Daarna is bijvoorbeeld `results-panel.tsx:19-33` (het `VERDICT`-object met vier
`React.CSSProperties`) een simpele class-map:

```tsx
const VERDICT: Record<ImpactVerdict, { text: string; className: string }> = {
  gestegen:       { text: "Gestegen",        className: "chip chip-success" },
  gedaald:        { text: "Gedaald",         className: "chip chip-danger"  },
  gelijk:         { text: "Nog gelijk",      className: "chip chip-neutral" },
  te_weinig_data: { text: "Nog aan het meten", className: "chip chip-neutral" },
};
```

Dezelfde vervanging geldt voor `library-list.tsx:24-38`, `audit-panel.tsx:19-31`,
`answers-view.tsx:177-178`, `offsite-panel.tsx:29-31`, `error-notice.tsx:33`,
`audit-gate.tsx:36`. Netto verdwijnen er ~30 inline-styles en één zwevende
kleurenpalet.

#### 4. De lege staat bestaat in vier varianten

| Plek | Vorm |
|---|---|
| `components/empty-state.tsx` | `py-14`, `gap-3`, geen CTA-slot |
| `app/analyses/page.tsx:57` | met de hand: `py-16`, `gap-4`, `live-dot`, CTA |
| `app/profielen/page.tsx:41` | met de hand: `py-16`, `gap-4`, `live-dot`, CTA |
| `app/analyses/new/page.tsx:34` | met de hand: `py-12`, `gap-4`, CTA |

Drie paddings, twee met een pulserende live-dot die niets aankondigt (er ís niets
live), en het gedeelde component kan geen CTA — precies de reden dat het
overal omzeild wordt.

```tsx
// components/empty-state.tsx — één vorm, mét actie
import Link from "next/link";

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-4 py-14 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-secondary">{children}</p>
      {action && (
        <Link href={action.href} className="btn-primary mt-1">
          {action.label}
        </Link>
      )}
    </div>
  );
}
```

En dan de drie handgemaakte varianten vervangen. De `live-dot` vervalt daarbij —
die hoort bij `WorkInProgress`, waar er écht iets draait.

#### 5. Paginakoppen: vier varianten, met resten

```
app/analyses/page.tsx:40      <h1 className="mt-1 text-3xl …">Overzicht</h1>   ← eyebrow erboven
app/profielen/page.tsx:29     <h1 className="mt-1 text-3xl …">Overzicht</h1>   ← eyebrow erboven
app/instellingen/page.tsx:9   <h1 className="mt-3 text-3xl …">Mijn instellingen</h1>
app/analyses/[id]/layout.tsx  <h1 className="text-2xl …">{analysis.name}</h1>
```

De `mt-3` op `/instellingen` is een restant: die marge compenseert een
terug-link die op die pagina niet bestaat. Twee koppen zijn `text-3xl`, één
`text-2xl`; twee hebben een `mono-label`-eyebrow, twee niet; drie hebben een
terug-link in drie licht verschillende bewoordingen ("← Mijn analyses",
"← Terug naar Mijn analyses", "← Terug naar Klantprofielen").

```tsx
// components/page-header.tsx (nieuw)
import Link from "next/link";

export function PageHeader({
  eyebrow, title, description, backHref, backLabel, action, aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {backHref && (
        <Link href={backHref} className="mono-label mb-2 w-fit transition-colors hover:text-[var(--text-primary)]">
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <span className="mono-label">{eyebrow}</span>}
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-secondary">{description}</p>}
        </div>
        {action ?? aside}
      </div>
    </div>
  );
}
```

Toepassen op alle zes de pagina's. Terug-links worden dan overal `← <sectienaam>`,
zonder "Terug naar".

---

### B7 · Layout-architectuur: breedte en drie identieke layouts

**Huidige situatie & knelpunt**
`AppShell` zet `max-w-5xl` (`app-shell.tsx:56`); drie pagina's zetten dáárbinnen
nog eens `mx-auto max-w-xl` (`analyses/new`, `profielen/nieuw`, `instellingen`).
Een constraint binnen een constraint — de effectieve breedte staat op twee
plekken en niemand ziet de tweede.

Daarnaast zijn `app/analyses/layout.tsx`, `app/profielen/layout.tsx` en
`app/instellingen/layout.tsx` **letterlijk identiek** (op de JSDoc-regel na):
`requireUser()` + `<AppShell>`. Drie bestanden die precies hetzelfde doen.

**UX/UI-verbetervoorstel**
Eén route group `(app)` met één layout. Formulierpagina's krijgen een expliciete
`narrow`-variant van de shell in plaats van een tweede `max-w`. Waarom: als de
breedte van een pagina op één plek staat, blijft hij consistent; nu wijkt hij
per pagina af zonder dat iemand het merkt.

**Concrete code-aanpassing**

```
app/
  (app)/
    layout.tsx          ← requireUser + AppShell, één keer
    analyses/…          ← verplaatst (routes blijven /analyses/…)
    profielen/…
    instellingen/…
```

```tsx
// app/(app)/layout.tsx
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
```

Route groups veranderen de URL's niet — `/analyses` blijft `/analyses`. De drie
oude layout-bestanden vervallen.

Voor de smalle pagina's één primitief in plaats van losse `max-w-xl`:

```tsx
// components/narrow.tsx
export function Narrow({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-6">{children}</div>;
}
```

---

## Volgorde van uitvoeren

Gesorteerd op *effect gedeeld door moeite*:

| # | Ingreep | Sectie | Moeite | Effect |
|---|---|---|---|---|
| 1 | `loading.tsx` / `error.tsx` / `not-found.tsx` + skeletons | B5 | ~1u | App voelt direct sneller en heler |
| 2 | Navigatie ontdubbelen + actieve staat + één `NAV` | B1 | ~1u | "Waar ben ik / hoe groot is dit product" |
| 3 | Lege staat `/analyses` naar de juiste eerste stap | B2 | ~15m | Haalt een dood einde uit de instap |
| 4 | `.card`-hover splitsen + knophoogtes + `EmptyState` + `PageHeader` | B6 | ~2u | Rommeligheid verdwijnt over de hele app |
| 5 | Chip-tinten als classes, inline-styles eruit | B6.3 | ~2u | Kleurdrift weg, kleiner oppervlak |
| 6 | `phaseOf()` + fase-bewuste tabs + review-gate uit "Instellingen" | B4 | ~3u | Grootste structurele winst, meeste denkwerk |
| 7 | Route group `(app)` + `Narrow` | B7 | ~1u | Drie bestanden weg, breedte op één plek |
| 8 | Onboarding: stap 5 weg, terminologie gelijk | B3 | ~30m | Kortere reis, één woordenschat |

Punt 1 t/m 5 zijn mechanisch en risicoloos. Punt 6 is de enige die
productbeslissingen vraagt (met name: wordt de goedkeuring een eigen scherm of
een redirect naar het instellingen-tabblad).
