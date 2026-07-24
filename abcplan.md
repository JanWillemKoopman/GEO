# Bouwplan MVP — Fase A + B + C (volautomatisch, met OpenAI)

> Gedetailleerd technisch plan voor de eerste tool: **A. Meten → B. Adviseren → C. Genereren**, volledig automatisch. Content wordt in de app afgeleverd onder het tabblad **"Content Bibliotheek"**. Publiceren naar een CMS (D), self-healing (E) en uitbreiding (F) komen later.

> ## 🔒 Vastgelegde technische keuze — niet ter discussie in deze bouwfase
> **We bouwen uitsluitend met de OpenAI API.** Twee instapmodellen, gedifferentieerd per halte: **`gpt-4.1-nano`** voor hoogvolume/classificatietaken, **`gpt-4.1-mini`** voor laagvolume/kwaliteitsgevoelige taken (zie §2 voor de exacte verdeling). Geen Gemini, geen tweede engine, geen premium modellen tijdens het bouwen. Doel van deze fase: **technisch werkend krijgen**, niet uitrollen.

*Techstack: Node.js + Next.js op Vercel · Supabase (Auth/Postgres/cron) · **OpenAI API (`gpt-4.1-nano` + `gpt-4.1-mini`)** · Resend (e-mail). Opgesteld juli 2026.*

---

## Leeswijzer voor de bouwer

Dit document is zelfstandig leesbaar en bedoeld als volledige technische spec voor de bouwfase. Aanbevolen leesvolgorde:

1. **§1–2** — scope, filosofie en de (vastgelegde) modelkeuze — het "waarom".
2. **§3** — het kernobject "Analyse", de klantreis (§3.7) en de statusmachine — leidend voor alle UI-beslissingen.
3. **§4–5** — architectuur, datamodel en de RLS/schrijfstrategie — leidend voor de Supabase-opzet.
4. **§6–8** — de pipeline zelf, halte voor halte, met Zod-schema's en API-gedrag per fase (A/B/C).
5. **§9–10** — de samengevatte flow en het kostenplaatje.
6. **§11 Bouwvolgorde** — **dit is ook de bouwvolgorde**: elke sprint bouwt voort op de vorige en dekt een afgebakend stuk van §3–8.
7. **§12 Vastgelegde keuzes** — de checklist: elke keuze hier is een bewuste beslissing, geen open vraag. Wijk er niet vanaf zonder terug te koppelen.
8. **§13** — expliciet wat *niet* in deze bouwfase hoort (CMS-publicatie, self-healing, tweede LLM-engine).

Alle Zod-schema's in dit document zijn de daadwerkelijke contracten voor de OpenAI `structured output`-calls — implementeer ze letterlijk, ze zijn niet illustratief bedoeld.

> **🎨 Voor alle visuele/UI-implementatie:** raadpleeg **[designsystem.md](./designsystem.md)** — kleuren, typografie, spacing, componenten en dark-mode-tokens staan daar vastgelegd, gebaseerd op een grondige analyse van InSpace. Dit document (`abcplan.md`) beschrijft *wat* er gebouwd wordt en welke data erachter zit; `designsystem.md` beschrijft *hoe het eruitziet*. Bouw geen scherm zonder er even naast te leggen.

---

## 1. Scope & filosofie

**Wat de MVP doet, met twee bewuste momenten waar de klant tussenkomt (de review-gate en C, zie hieronder):**

- **A — Meten:** website-URL (+ optioneel onderwerp/product) → OpenAI analyseert de site (eigen crawl + web-search-tool), gescoped op het onderwerp indien opgegeven → 30 prompts in categorieën → **klant reviewt en bevestigt (transparantie-stap, §3.6)** → nulmeting + optionele 10-weken-monitoring → zichtbaarheidsdata.
- **B — Adviseren:** OpenAI analyseert de meetdata → rapport met zichtbaarheids-gaps en concrete content-aanbevelingen (welke pagina's ontbreken om geciteerd te worden).
- **C — Genereren:** OpenAI schrijft de aanbevolen pagina's als kant-en-klare concepten, **op klant-verzoek** → verschijnen in de **Content Bibliotheek** waar de klant ze leest, kopieert of downloadt.

Dit alles draait niet meer rond één "merk", maar rond het beheerobject **"Analyse"** — zie §3. Eén klant kan meerdere analyses aanmaken, elk gescoped op een eigen website + (optioneel) onderwerp/product. De volledige klantreis (de "trechter") staat uitgewerkt in §3.7.

**Transparantie is een kernprincipe, niet een bijzaak:** de klant ziet en kan bijsturen wat er "achter de schermen" gebeurt (Brand DNA + prompts) vóórdat er ook maar één betaalde meting plaatsvindt — zie §3.6.

**Bewust NIET in deze MVP:** publiceren naar CMS, self-healing, meertalige productie op schaal. De klant krijgt de content *aangeleverd in de app*; wat hij ermee doet is (voorlopig) aan hem.

**Waarom dit volautomatisch kán:** er is geen schrijf-toegang tot externe systemen nodig. Alles blijft binnen onze eigen app en database. Dat elimineert precies de risico's (CMS-auth, per-site-publicatie, rollback) die D/E/F complex maken.

**Ontwerpprincipe blijft:** "stupid simple, don't make me think." De klant vult URL (+ evt. onderwerp) in en krijgt achtereenvolgens: een score, een rapport en een gevulde bibliotheek — zonder knoppen die hij niet snapt.

---

## 2. Modelkeuze — waarom `gpt-4.1-nano` en waarom OpenAI-only

### Waarom OpenAI (en geen Gemini) in deze fase
Puur een projectbeslissing: één engine, één SDK, één factuur, zo min mogelijk bewegende delen tijdens het bouwen. Multi-engine (Gemini/Perplexity/Claude erbij) is een latere, expliciete uitbreiding — geen onderdeel van deze bouwfase.

### Waarom `gpt-4.1-nano` als basis, en niet een ander instapmodel

| Model | Prijs (indicatief, in/1M) | Structured output betrouwbaar? | Keuze |
|-------|---------------------------|--------------------------------|-------|
| gpt-5-nano | laagst | ⚠️ Gemelde problemen: volgt het JSON-schema niet consequent (verkeerde velden/volgorde) | ❌ Vermijden |
| **gpt-4.1-nano** | $0,10 / $0,40 | ✅ Betrouwbaar, geen gemelde problemen | ✅ Voor hoogvolume/classificatietaken (zie hieronder) |
| **gpt-4.1-mini** | $0,40 / $1,60 | ✅ Zeer betrouwbaar, merkbaar sterker in redeneren/diversiteit | ✅ Voor laagvolume/kwaliteitsgevoelige taken (zie hieronder) |
| gpt-4o-mini | $0,15 / $0,60 | ✅ Zeer betrouwbaar (het model waarmee structured outputs oorspronkelijk geïntroduceerd is) | Reserve/fallback |

**Onze hele pipeline leunt op structured output** (Brand DNA, prompts, mentions, rapport, content komen allemaal terug als vast JSON-schema). Betrouwbaarheid van schema-naleving weegt daarom zwaarder dan de laatste cent prijsverschil. Beide gekozen modellen zijn vrij van de bekende schema-problemen van gpt-5-nano.

### ✅ Vastgelegd: gedifferentieerde modelstrategie per halte

**Waarom niet overal hetzelfde model?** Een nano-model dat in één call 30 diverse, categorie-specifieke prompts moet bedenken, of een concurrentie-gap-analyse moet schrijven, levert merkbaar minder diverse/scherpe output dan een iets sterker model. Tegelijk is het prijsverschil tussen nano en mini in **absolute dollars verwaarloosbaar** zodra een call maar 1–8× per analyse draait (in plaats van 30-60×). De vuistregel:

| Halte | Hoe vaak per analyse? | Model | Waarom |
|-------|------------------------|-------|--------|
| 1 · Brand DNA | 1× | `gpt-4.1-mini` | Eenmalige, kwaliteitsgevoelige analyse — prijsverschil met nano is ~$0,004/analyse. |
| 2 · Prompt-generatie | 5× (per categorie, zie §6 A2) | `gpt-4.1-mini` | Diversiteit en categorie-scherpte wegen zwaarder dan de paar dubbeltjescent verschil. |
| 3a · AI-antwoord simuleren | 30×/week | `gpt-4.1-nano` | Hoogvolume; het antwoord leunt vooral op de `web_search`-resultaten, niet op modelcreativiteit. |
| 3b · Mention beoordelen | 30×/week | `gpt-4.1-nano` | Classificatie-achtige taak (ja/nee, sentiment, positie) — nano is hier prima en de volumekosten tellen wél op. |
| B1 · Concurrentie-gap-analyse | 1× per rapport | `gpt-4.1-mini` | Vergt echt redeneren over waar concurrenten winnen — zie §7. |
| B2 · Rapport & aanbevelingen | 1× per rapport | `gpt-4.1-mini` | Eindproduct dat de klant leest; kwaliteit weegt zwaar, kosten zijn triviaal. |
| 6 · Content-generatie | 1× per pagina, op klik | `gpt-4.1-mini` | Dit ís het product dat de klant meeneemt — kwaliteit boven een paar cent besparing. |

**Kort samengevat:** `gpt-4.1-nano` alleen waar het *aantal* calls de kosten drijft (halte 3, 30-60×/week); `gpt-4.1-mini` overal waar de call maar een handvol keer per analyse draait en de kwaliteit van het denkwerk er echt toe doet. Zie §10 voor de herrekende kosten — het verschil is ~$0,01/analyse, verwaarloosbaar.

**Fallback-regel:** als tijdens Sprint 1 blijkt dat een van beide modellen bij een specifiek schema toch afwijkt, val dan alleen vóór dát ene aanroeppunt terug op `gpt-4o-mini`. De rest van de pipeline blijft ongewijzigd.

> **Prijsvoorbehoud:** online prijsopgaven voor actuele modellen lopen tussen bronnen uiteen (snel-verouderende prijspagina's). Controleer `platform.openai.com/pricing` voor de exacte, actuele tarieven vóór je een kostenbegroting op schaal maakt. De **modelstrategie zelf staat vast** — alleen de prijscijfers in §10 zijn indicatief.

### Welke OpenAI-features de flow mogelijk maken

| Feature | Wat het doet | Waar we het gebruiken |
|---------|--------------|----------------------|
| **`web_search`-tool (Responses API)** | Model mag live het web doorzoeken en citeert bronnen | Stap A: branche/concurrenten begrijpen; meten of merk genoemd wordt |
| **Eigen crawler (géén API-tool)** | Node.js haalt zelf de klant-website op en zet 'm om naar platte tekst | Stap A: de specifieke klant-URL inhoudelijk lezen |
| **Structured output (JSON Schema via Zod-helper)** | Antwoord dwingt in een vast, type-safe JSON-formaat | Overal: prompts, rapport, content als voorspelbare objecten |

**Belangrijk verschil met een Gemini-aanpak:** OpenAI heeft geen ingebouwde "lees deze ene URL"-tool zoals Gemini's URL-context. Daarom lezen we de klant-website **zelf** (een simpele `fetch` + tekst-extractie in Node.js, geen API-kosten) en géven we die tekst als context mee aan de OpenAI-call. De `web_search`-tool gebruiken we daarnaast voor de bredere marktcontext (concurrenten, hoe het merk/onderwerp online voorkomt).

We gebruiken de officiële **`openai`** Node-SDK, met **Zod**-schema's voor structured output.

> **Kostennoot:** de `web_search`-tool wordt apart afgerekend (vast tarief per call + een vaste hoeveelheid "search content"-tokens per call, zie §10). We zetten hem alleen aan waar echt nodig (branche-analyse + meting), niet bij pure tekstgeneratie.

---

## 3. Analyses — het kernobject en hoe de klant dit beheert

Dit is de belangrijkste structurele wijziging in dit plan: het draaipunt van de app is niet langer "één merk = één workspace", maar **de Analyse**. Een klant kan er meerdere aanmaken, elk met een eigen scope.

### 3.1 Het onboarding-formulier: twee velden

| Veld | Verplicht? | Voorbeeld |
|------|-----------|-----------|
| **Website-URL** | Ja | `mediamarkt.nl` |
| **Onderwerp / product / thema** | Nee (optioneel) | `iPhone`, `Smartphone reparatie` |

**Waarom dit tweede veld cruciaal is:** zonder scope is een meting voor een groot bedrijf als MediaMarkt te breed en niet-stuurbaar — "hoe zichtbaar is MediaMarkt in AI" zegt weinig. Met het onderwerp-veld ingevuld op bijvoorbeeld **"iPhone"**, wordt de hele analyse — Brand DNA, de 30 prompts, de meting, het rapport — **gescoped op dat specifieke productsegment**, zodat MediaMarkt precies kan zien en sturen hoe zij scoren *binnen die categorie*, los van hun brede assortiment.

### 3.2 Gedrag afhankelijk van het onderwerp-veld — ✅ vastgelegd

- **Onderwerp leeg gelaten:** de website wordt in zijn volledigheid geanalyseerd. Brand DNA beschrijft het hele bedrijf/aanbod; de 30 prompts dekken alle diensten/producten die de site aanbiedt (zoals in de oorspronkelijke opzet van dit plan).
- **Onderwerp ingevuld:** Brand DNA (halte 1) wordt **specifiek voor dat onderwerp** opgesteld — welke rol speelt dit product/segment binnen het bedrijf, welke concurrenten zijn relevant *voor dit segment* (niet per se de concurrenten van het hele bedrijf), welke persona's zoeken hiernaar. De 30 prompts (halte 2) gaan **uitsluitend over dat onderwerp** binnen de context van het merk (bv. "Waar koop ik het beste een iPhone?", "MediaMarkt vs Coolblue voor iPhone-reparatie", "Wat kost een iPhone-schermreparatie bij MediaMarkt?") — geen prompts over wasmachines of tv's als het onderwerp "iPhone" is.

### 3.3 Eén klant, meerdere analyses
Een account kan onbeperkt analyses aanmaken. Elke analyse is **volledig zelfstandig**: eigen Brand DNA, eigen 30 prompts, eigen tracking, eigen rapport, eigen Content Bibliotheek, eigen aan/uit-schakelaar voor de wekelijkse lus. Twee analyses voor dezelfde website (bv. MediaMarkt + "iPhone" én MediaMarkt + "wasmachines") delen niets — dat is bewust simpel gehouden; brand-niveau deduplicatie is geen MVP-scope.

**Onderwerp is niet achteraf wijzigbaar.** Zodra een analyse is gestart, staat het onderwerp vast — wijzigen zou het Brand DNA en de prompts met terugwerkende kracht ongeldig maken. Wil de klant een andere scope, dan start hij een **nieuwe analyse** (kost een nieuwe nulmeting, ~$0,35, zie §10).

### 3.4 "Mijn analyses" — het landingsscherm na inloggen
Na inloggen ziet de klant een lijst van al zijn analyses, niet direct een enkele workspace:

- Per rij: naam (auto-gegenereerd als `{website} — {onderwerp}` of `{website} (hele site)` zonder onderwerp), status-badge, huidige zichtbaarheidsscore (indien beschikbaar), laatst bijgewerkt.
- **✅ Herzien: 6 status-badges, één-op-één met `analyses.status`** (niet 3 zoals eerder, om de "wacht op mij"-momenten niet te verbergen):
  - `Bezig…` (`bezig`) — halte 0-2 lopen, geen actie nodig.
  - **`Wacht op jouw goedkeuring`** (`concept_klaar`) — ✅ **visueel geprioriteerd** (bovenaan de lijst, opvallende kleur): dit is het enige moment waarop de klant iets *moet* doen om verder te komen. Zonder nadruk kan een klant analyses onopgemerkt laten "hangen".
  - `Meten…` (`meten`) — halte 3 loopt, geen actie nodig.
  - `Score klaar, rapport volgt` (`gemeten`) — score al bekijkbaar in Overzicht, rapport nog niet.
  - `Gereed` (`gereed`) — nulmeting + rapport allebei beschikbaar.
  - `Mislukt` (`mislukt`) — met retry-knop.
- **Grote, altijd zichtbare knop: "+ Nieuwe analyse starten."** Start halte 0 opnieuw (nieuw formulier: URL + onderwerp), volledig onafhankelijk van bestaande analyses. Dit kan de klant **altijd**, op elk moment.
- Klik op een rij → opent de workspace van die ene analyse.

### 3.5 De workspace van één analyse — 4 tabbladen
De workspace van een analyse bestaat uit 4 tabbladen:

- **Overzicht** — score, trendlijn, jij-vs-concurrenten (zie eerdere versie van dit plan / het pipeline-overzicht).
- **Rapport** — gaps + aanbevelingen + "Genereer deze pagina".
- **Content Bibliotheek** — kaarten met gegenereerde pagina's.
- **Instellingen** — de centrale beheerplek voor déze analyse:
  - Website + onderwerp, **read-only** (zie 3.3 — niet wijzigbaar na start).
  - **Brand DNA — inzichtelijk én bewerkbaar** (zie 3.6): alle velden (branche, producten, tone-of-voice, persona's, waardeproposities, concurrenten) worden getoond en kunnen door de klant aangepast worden.
  - **De volledige prompt-lijst (alle 30, of meer/minder na beheer), te allen tijde inzichtelijk én beheerbaar:**
    - ✏️ **Bestaande prompt wijzigen** (tekst en/of categorie aanpassen).
    - ➕ **Nieuwe prompt toevoegen** (vrij tekstveld + categorie-keuze).
    - 🗑️ **Prompt verwijderen.**
    - ⏸️ **Aan/uit per prompt** (tijdelijk pauzeren zonder verwijderen).
  - **Wekelijkse tracking: aan/uit** (`tracking_enabled`).

**Belangrijk ontwerpbesluit — vooruitkijkend beheer:** wijzigingen aan de prompt-lijst raken nooit de al verzamelde historische `tracking_runs` (data-integriteit blijft intact voor de trendlijn — zie §5, `prompt_text_snapshot`). Een nieuwe of gewijzigde prompt telt pas mee vanaf de **eerstvolgende meting**.

**Dit tabblad Instellingen speelt een dubbele rol:** de **eerste keer** dat een analyse hier terechtkomt (direct na halte 2) is het een **verplichte review-stap** vóórdat er gemeten wordt (zie 3.6). **Daarna** is het gewoon de doorlopende beheerplek, zonder verplichting.

### 3.6 Transparantie & goedkeuring — de review-stap tussen halte 2 en halte 3 (✅ vastgelegd)

Direct nadat halte 1 (Brand DNA) en halte 2 (30 prompts) automatisch zijn doorlopen, **stopt de pipeline bewust** en krijgt de klant het volledige resultaat te zien — niets gebeurt "achter de schermen" zonder dat de klant het kan inzien of bijsturen:

1. **Transparantie:** zodra halte 1+2 klaar zijn (`analyses.status = 'concept_klaar'`), landt de klant automatisch op het tabblad **Instellingen**, dat nu fungeert als een **concept-scherm**: het volledige Brand DNA (branche, producten, tone-of-voice, persona's, waardeproposities, concurrenten) én de volledige lijst van 30 prompts staan hier leesbaar, gegroepeerd per categorie.
2. **Bewerkbaar:** de klant kan, vóórdat er ook maar één meting is gedaan, zowel het **Brand DNA aanpassen** (bv. een verkeerd geïdentificeerde concurrent verwijderen) als de **prompts bewerken** (zie A2b, §6) — exact dezelfde CRUD-mechaniek die ook later blijft bestaan.
3. **Definitieve bevestiging:** onderaan staat één duidelijke knop: **"Bevestig en start meting."** Pas na deze klik:
   - `analyses.status` gaat van `'concept_klaar'` naar `'meten'`,
   - halte 3 (de nulmeting) start,
   - de prompt-lijst en het Brand DNA blijven daarna nog steeds bewerkbaar (zie 3.5), maar niet meer als verplichte stap — gewoon doorlopend beheer.

**Waarom dit zo werkt:** de klant moet nooit het gevoel hebben dat een "black box" zomaar gaat meten en geld/tijd besteedt op basis van een automatische inschatting die hij niet gezien heeft. Door dit expliciete, verplichte goedkeuringsmoment in te bouwen, is elke stap van de pipeline zichtbaar en controleerbaar vóórdat de (duurdere) meetfase start.

### 3.7 De trechter — het klantperspectief (✅ vastgelegd, leidend voor de UI/UX)

Vanuit de klant bekeken is dit de volledige, logische trechter waarin hij zich op elk moment bevindt. Elke stap heeft een duidelijke naam, een duidelijk vervolg, en de klant weet altijd waar hij is:

| # | Scherm | Wat de klant ziet/doet | Status van de analyse |
|---|--------|--------------------------|------------------------|
| 1 | **Inloggen** | E-mail + wachtwoord (Supabase Auth). | — |
| 2 | **Mijn analyses** | Lijst van bestaande analyses (of leeg bij eerste bezoek) + knop "+ Nieuwe analyse starten". | — |
| 3 | **Nieuwe analyse — formulier** | Twee velden: website-URL + optioneel onderwerp/product. Knop "Start analyse". | `bezig` aangemaakt |
| 4 | **Voortgangsscherm (transparant, live)** | Duidelijke, simpele voortgangsindicatie: *"Website lezen ✓ → Merk analyseren… → Prompts opstellen…"* — de klant ziet dat er iets gebeurt, geen kale laadspinner. Duurt doorgaans enkele tientallen seconden. | `bezig` |
| 5 | **Concept & goedkeuring** *(= tabblad Instellingen, eerste keer verplicht)* | Brand DNA + 30 prompts, volledig leesbaar en bewerkbaar. Knop **"Bevestig en start meting."** | `concept_klaar` → klik → `meten` |
| 6 | **Meten (transparant, live)** | Korte voortgangsindicatie op Overzicht: *"Bezig met meten… (x/30 prompts verwerkt)"*. | `meten` |
| 7 | **Score klaar, rapport volgt** *(✅ nieuw tussenmoment)* | Tab Overzicht toont al de score/trendlijn; tab Rapport toont *"Rapport wordt opgesteld…"*. | `gemeten` → automatisch → `gereed` zodra B1+B2 klaar zijn |
| 8 | **Analyse-workspace** | De 4 tabbladen volledig gevuld: Overzicht (score), Rapport (aanbevelingen), Content Bibliotheek, Instellingen (nu doorlopend beheer, niet meer verplicht). | `gereed` |
| 9 | **Terug naar Mijn analyses, altijd** | Vanuit elke stap kan de klant terug naar het overzicht van al zijn analyses, en op elk moment een geheel nieuwe analyse starten (stap 3), onafhankelijk van waar hij in een andere analyse is. | — |

**Ontwerpregel:** de klant bevindt zich **altijd in precies één van deze 9 stappen**, en elk scherm maakt duidelijk wat de vorige stap was en wat de volgende actie is (geen dead ends, geen schermen zonder duidelijke "volgende stap"-knop). Dit is de concrete invulling van "stupid simple, don't make me think" toegepast op de klantreis als geheel, niet alleen op individuele schermen.

**✅ Vastgelegd — voortgangsschermen zijn server-state-gedreven, niet client-only:** de indicatoren in stap 4, 6 en 7 (*"Website lezen ✓…"*, *"x/30 verwerkt"*, *"Rapport wordt opgesteld"*) worden **afgeleid van echte data** (`analyses.status` + voortgang in de `jobs`-tabel), niet van een lokale animatie. Sluit de klant het scherm en komt hij een uur later terug, dan toont de pagina exact de actuele stand — nooit een animatie die "opnieuw begint" of stil blijft staan terwijl er allang meer gebeurd is.

**✅ Vastgelegd — extra aandacht voor mobiel op het concept-scherm (stap 5):** dit is het meest informatiedichte scherm in de hele app (volledig Brand DNA + 30 bewerkbare prompts) én het enige scherm waar **elke** analyse verplicht doorheen moet. "Mobiel-vriendelijk" is hier geen nice-to-have maar een randvoorwaarde — geef dit scherm bij het bouwen expliciet extra aandacht (bijv. inklapbare secties per Brand DNA-veld, prompts gegroepeerd en pas op tik uitklapbaar per categorie) in plaats van simpelweg de desktop-lay-out te verkleinen. De volledige, app-brede responsive-strategie (breakpoints, patronen per component, desktop-first ontwerpproces) staat vastgelegd in [designsystem.md §D](./designsystem.md#d—responsive-strategie-desktop-first-uitgangspunt-mobiel-bewust-heruitgevonden) — leidend voor elk scherm, niet alleen dit concept-scherm.

---

## 4. Architectuur op hoofdlijnen

```
                    KLANT (browser / mobiel)
                            │
                            ▼
        ┌────────────────────────────────────────────────┐
        │           Vercel — Next.js / Node.js            │
        │                                                 │
        │  /analyses                 → "Mijn analyses"-lijst
        │                               + "Nieuwe analyse"-knop
        │  /analyses/[id]/overzicht   │
        │  /analyses/[id]/rapport     │  UI-tabs per analyse
        │  /analyses/[id]/bibliotheek │
        │  /analyses/[id]/instellingen (= concept-scherm de eerste
        │    keer; daarna doorlopend: DNA + prompt-CRUD,
        │    tracking-toggle)                             │
        │                                                 │
        │  Eigen crawler: fetch + tekst-extractie         │
        │  (geen API-kosten, alleen de klant-URL)         │
        │                                                 │
        │  API-routes (server):                           │
        │   • /api/analyses              (CRUD analyses)  │
        │   • /api/analyses/[id]/brand-dna (bekijk/bewerk) │
        │   • /api/analyses/[id]/prompts   (CRUD prompts)  │
        │   • /api/analyses/[id]/confirm   (A2c: bevestig, │
        │       zet status 'concept_klaar' → 'meten')      │
        │   • /api/analyses/[id]/report    (B: rapport)    │
        │   • /api/analyses/[id]/generate  (C: content)    │
        │                                                 │
        │  Cron (Vercel Cron / Supabase pg_cron):         │
        │   • weekly-tracking-run                         │
        │     (verwerkt alléén analyses met                │
        │      tracking_enabled = true)                   │
        └───────────────┬────────────────┬────────────────┘
                        │                │
                        ▼                ▼
              ┌──────────────┐   ┌──────────────────┐
              │  OpenAI API  │   │    Supabase      │
              │  gpt-4.1-nano│   │  Postgres + Auth │
              │  • web_search│   │  + RLS + cron    │
              │  • structured│   └──────────────────┘
              └──────────────┘            │
                        └──────► Resend (rapport-e-mail)
```

### Uitvoeringsmodel
- **Korte taken** (analyse, één rapport, één pagina, prompt-CRUD) → Next.js API-route / serverless function op Vercel.
- **Lange/herhalende taken** (nulmeting, wekelijkse tracking, batch-generatie van pagina's) → **job-queue in Supabase** die door een **cron** afgewerkt wordt in kleine batches, per analyse. Zo blijven we binnen serverless time-limits en houden we de kosten controleerbaar, ook als een klant tientallen analyses tegelijk heeft lopen.

---

## 5. Datamodel (Supabase / Postgres)

> ### 🔒 Vastgelegd principe: we bewaren álles
> **Elke AI-call in deze pipeline slaat zijn volledige resultaat op in Supabase — nooit alleen een samenvatting of afgeleide waarde.** Dat betekent: de ruwe JSON-output van elke OpenAI-call (Brand DNA, prompt-generatie, mention-beoordeling, rapport, content) wordt **altijd** volledig bewaard, náást de uitgesplitste kolommen die de UI gebruikt. Reden: (1) niets gaat verloren als we later een kolom toevoegen of een parsing-bug vinden, (2) volledige audit-trail — je kunt precies reconstrueren wat het model op elk moment zag en antwoordde, (3) het maakt herberekening/herprocessing achteraf mogelijk zonder opnieuw te hoeven bevragen (dus zonder extra kosten). Elke tabel die AI-output bevat heeft daarom een `raw_json`-kolom (of gebruikt een bestaand JSON-veld) met het complete, ongewijzigde antwoord.

```
users                 (Supabase Auth)
analyses              id, user_id, url, topic(nullable), name,
                      status ('bezig'|'concept_klaar'|'meten'|'gemeten'|'gereed'|'mislukt'),
                      -- ✅ herzien: 'gemeten' toegevoegd (zie §3.4) — anders betekent
                      -- 'gereed' twee dingen tegelijk: "score klaar" (na A3) én
                      -- "rapport klaar" (na B2), wat tab-beschikbaarheid onduidelijk maakt
                      tracking_enabled(bool, default false), created_at
brand_dna             id, analysis_id, tone_of_voice, products[], personas[],
                      value_props[], competitors[], summary,
                      raw_json,                    -- ← volledige ruwe OpenAI-output (halte 1)
                      edited_by_user(bool, default false), updated_at
                      -- gescoped op het onderwerp indien opgegeven (zie §3.2)
prompts               id, analysis_id, text, category, intent, active,
                      created_by ('system'|'user'), source_raw_json,
                      -- source_raw_json: het fragment van de halte-2-output
                      -- waaruit déze prompt ontstond (audit-trail per prompt)
                      updated_at
tracking_runs         id, prompt_id, prompt_text_snapshot, prompt_category_snapshot,
                      -- snapshot = de prompt-tekst/categorie ZOALS DIE WAS op het
                      -- moment van meten — blijft ongewijzigd ook als de prompt
                      -- later bewerkt/verwijderd wordt (zie §3.5, vooruitkijkend beheer)
                      engine, model_used, week_no, ran_at,
                      raw_response,                -- ← ruw AI-antwoord uit 3a (het "gesimuleerde" antwoord)
                      raw_response_received_at,     -- ← voor idempotente retries (zie A3, 3b)
                      mention_json,                 -- ← volledige ruwe structured-output uit 3b (alle entiteiten)
                      openai_response_id, tokens_used, cost_usd
tracking_run_mentions  id, tracking_run_id, entity_name, is_own_brand(bool),
                      mentioned(bool), position, sentiment, cited_sources[]
                      -- ← genormaliseerde vorm van mention_json: ÉÉN RIJ PER ENTITEIT
                      -- (eigen merk + elke concurrent) per meting. Dit is de bron
                      -- voor visibility_scores (waar is_own_brand = true) én voor
                      -- 3c/competitor_breakdown (waar is_own_brand = false) — zonder
                      -- dit zou een "bronnen per concurrent"-analyse niet uit te
                      -- rekenen zijn (zie herziening naar aanleiding van pipeline-review)
visibility_scores     analysis_id, week_no, score, share_of_voice, per_engine_json
competitor_breakdown   id, analysis_id, week_no, competitor_name,
                      mentions_count, mentions_by_category_json,
                      top_cited_sources[], winning_run_ids[], losing_run_ids[]
                      -- winning/losing_run_ids verwijzen naar tracking_runs.id
                      -- (niet naar losse prompt-tekst) zodat de klant vanuit het
                      -- rapport kan doorklikken naar de daadwerkelijke AI-conversatie
                      -- ← berekend in halte 3c (geen AI-call), input voor FASE B1
reports               id, analysis_id, period, summary, gaps_json,
                      recommendations_json,
                      gap_analysis_raw_json,       -- ← volledige ruwe OpenAI-output van B1
                      raw_json,                    -- ← volledige ruwe OpenAI-output van B2
                      generated_at
content_pieces        id, analysis_id, report_id, type, title, target_intent,
                      cluster, body_markdown, meta_title, meta_description,
                      schema_jsonld, faq_json, raw_json,  -- ← volledige ruwe OpenAI-output (halte 6)
                      status, word_count, created_at
jobs                  id, analysis_id, type, payload_json, status,
                      attempts, scheduled_for, last_error
```

**Kernrelaties:** een `user` heeft veel `analyses`; een `analysis` heeft één `brand_dna` en veel `prompts`; elke prompt genereert (indien actief) `tracking_runs`; elke `tracking_run` heeft veel `tracking_run_mentions` (één rij per entiteit — eigen merk + elke concurrent); die rollen op naar `visibility_scores` (via `is_own_brand = true`) **én** `competitor_breakdown` (via `is_own_brand = false`, de per-concurrent uitsplitsing); die laatste voedt de gap-analyse (B1) die op zijn beurt het `report` met `recommendations` voedt (B2); elke aanbeveling wordt een `content_piece` in de bibliotheek. `jobs` is de motor voor async werk, altijd gekoppeld aan één `analysis_id`.

**`prompts.created_by`** onderscheidt systeem-gegenereerde prompts (halte 2) van door de klant zelf toegevoegde prompts — puur informatief in de UI ("door jou toegevoegd"-label).

**`tracking_runs.prompt_text_snapshot` / `prompt_category_snapshot`** zijn bewust **gedenormaliseerd** (dubbel opgeslagen, niet alleen via `prompt_id` opgezocht): omdat prompts achteraf bewerkbaar/verwijderbaar zijn (§3.5, §6 A2b), zou een live-join naar `prompts` de geschiedenis vervalsen. Door de tekst/categorie te bevriezen op het moment van meten, blijft de trendlijn en het rapport historisch correct, ongeacht latere wijzigingen.

**`brand_dna.edited_by_user`** vlagt of de klant het automatisch gegenereerde Brand DNA heeft aangepast tijdens de review (zie §3.6 / §6 A2c) — puur informatief, geen functionele impact.

### ✅ Vastgelegd: RLS- en schrijfstrategie

**De vage regel "filtert op user_id" is onvoldoende om veilig op te bouwen.** Twee concrete problemen die dit voorkomt:
1. Zonder expliciete regel kan een developer per ongeluk de client rechtstreeks laten schrijven naar systeemtabellen (`tracking_runs`, `jobs`) — die horen alleen door de pipeline zelf gevuld te worden.
2. **Postgres RLS werkt op rij-niveau, niet op kolom-niveau.** RLS kan dus nooit afdwingen dat een klant wél `tracking_enabled` mag wijzigen maar niet `topic` — daarvoor is kolom-specifieke logica nodig, en die hoort niet in een RLS-policy thuis.

**De regel, simpel gehouden:**
- **Lezen:** de client leest **rechtstreeks** via de Supabase-client met de eigen sessie. RLS-policies zijn **SELECT-only** en filteren op `user_id` (direct op `analyses`, via `analysis_id` op de overige tabellen).
- **Schrijven:** **altijd** via een Next.js API-route, **nooit** rechtstreeks vanaf de client naar Postgres. Elke route gebruikt de **service-role key** (omzeilt RLS) en controleert zelf expliciet `analysis.user_id === ingelogde gebruiker` vóórdat 'ie iets wijzigt. Dit lost het kolom-niveau-probleem meteen op: de route bepaalt precies welke velden een klant mag aanpassen (bv. `/api/analyses/[id]/prompts` mag prompt-velden wijzigen, maar nooit `analyses.topic` of `analyses.status` direct — statuswijzigingen lopen alleen via de daarvoor bedoelde routes zoals `/confirm`).
- **`jobs`-tabel:** **geen enkele client-toegang**, ook geen SELECT. RLS staat aan met nul policies (standaard deny-all in Supabase) — puur backend-machinerie, nooit rechtstreeks aan de klant tonen.

| Tabel | Client leest? | Client schrijft rechtstreeks? |
|-------|---------------|-------------------------------|
| `analyses`, `brand_dna`, `prompts` | ✅ eigen rijen | ❌ nooit — altijd via API-route (service role + ownership-check) |
| `tracking_runs`, `tracking_run_mentions`, `visibility_scores`, `competitor_breakdown`, `reports`, `content_pieces` | ✅ eigen rijen (read-only) | ❌ nooit — uitsluitend door de pipeline zelf geschreven |
| `jobs` | ❌ geen toegang | ❌ geen toegang |

Dit is bewust een **simpelere** regel dan "RLS regelt alles": met alle schrijfacties achter API-routes hoeft RLS alleen nog *lees*-toegang te bewaken, en blijft de business-logica (welk veld mag wanneer wijzigen, welke statusovergangen zijn geldig) op één plek — in de route, niet verspreid over policies.

---

## 6. FASE A — Meten (volautomatisch, per analyse)

### A0. Nieuwe analyse starten — altijd beschikbaar
**Trigger:** klant klikt "+ Nieuwe analyse starten" vanuit "Mijn analyses" (zie §3.4). Dit kan op elk moment, ongeacht hoeveel andere analyses al lopen of klaar zijn.
**Formulier:** Website-URL (verplicht) + Onderwerp/product/thema (optioneel, vrije tekst).
→ Nieuwe rij in `analyses` met `status = 'bezig'`. Halte A1 start direct. **UI:** de klant ziet vanaf hier het transparante voortgangsscherm uit §3.7 (stap 4) — geen kale laadspinner, maar zichtbare stappen ("Website lezen…", "Merk analyseren…", "Prompts opstellen…").

### A1. Brand DNA (topic-aware)
**Stap 1 (geen API-call):** eigen Node.js-crawler haalt de homepage (+ evt. 2-3 kernpagina's) op met `fetch` en zet de HTML om naar schone platte tekst.
**Stap 2 (OpenAI-call, model `gpt-4.1-mini`):** Responses API-call met de geëxtraheerde tekst als context, **`web_search`-tool aan** (voor bredere marktcontext) en **structured output**. Model `gpt-4.1-mini` (niet nano, zie §2) — dit is een eenmalige, kwaliteitsgevoelige analyse die de basis vormt voor alle 30 prompts.

Prompt (kern) — **twee varianten, afhankelijk van of een onderwerp is opgegeven:**
- **Zonder onderwerp:** *"Analyseer dit bedrijf op basis van deze website-tekst en het web. Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten."*
- **Met onderwerp (bv. "iPhone"):** *"Analyseer dit bedrijf specifiek voor het onderwerp/product **'{onderwerp}'**. Bepaal: welke rol dit product/segment speelt binnen het bedrijf, tone-of-voice, doelgroep-persona's die hiernaar zoeken, waardeproposities **specifiek voor dit segment**, en 3–5 concurrenten die relevant zijn **voor dit specifieke onderwerp** (niet per se de concurrenten van het hele bedrijf)."*

Zod-schema (vereenvoudigd, ongewijzigd qua vorm):
```ts
const BrandDNA = z.object({
  industry: z.string(),
  products: z.array(z.string()),
  toneOfVoice: z.string(),
  personas: z.array(z.object({ name: z.string(), needs: z.array(z.string()) })),
  valueProps: z.array(z.string()),
  competitors: z.array(z.string()),
  summary: z.string(),
});
```
→ Opslaan in `brand_dna` (inclusief `raw_json`, zie §5), gekoppeld aan `analysis_id`. **Dit resultaat is straks volledig zichtbaar én bewerkbaar voor de klant** (zie A2c) — geen enkel veld blijft verborgen.

### A2. Prompt-generatie (30 stuks in categorieën, topic-aware) — ✅ vastgelegd, herzien

**✅ Vastgelegd: 5 aparte calls (één per categorie), niet 1 call voor alle 30.** Eén enkele call die een klein model 30 diverse, categorie-specifieke prompts in één keer laat verzinnen, levert in de praktijk te veel herhaling en te weinig scherpte per categorie op. Door de generatie op te splitsen krijgt elke categorie een eigen, gefocuste call — met een duidelijke instructie én 3-6 voorbeelden puur voor díe categorie — wat merkbaar diversere en relevantere prompts oplevert. **Model: `gpt-4.1-mini`** (zie §2) — de meerkosten van 5 mini-calls t.o.v. 1 nano-call zijn ~$0,002 per analyse, verwaarloosbaar.

> **🔒 VASTGELEGD — MERKNEUTRALITEIT (herzien: kritieke methodologische correctie).** Een gegenereerde prompt mag **NOOIT de eigen merknaam/het domein van de klant bevatten**. Een branded prompt (bv. *"Is MediaMarkt betrouwbaar?"*) garandeert een vermelding — de merknaam staat immers al in de vraag — en blaast de zichtbaarheidsscore kunstmatig op. De meting moet **spontane** vermeldingen meten: wat vraagt iemand die het merk nóg niet kent? Daarom (a) is de categorie **"Merkspecifiek" vervangen door "Aanbeveling/keuze"** (merkloze aanbevelingsvragen), (b) noemt **"Vergelijking"** voortaan concurrenten/type-aanbieders maar nooit het eigen merk, en (c) leidt halte 1 nu ook de **canonieke merknaam** af, die als harde uitsluiting aan de generatie wordt meegegeven én als vangnet-filter dient. Concurrenten noemen mág wél. Zie `lib/pipeline/prompts.ts`.

**Per categorie (5 calls, elk structured output, zonder `web_search`) — alle MERKNEUTRAAL:**

| Categorie | ~Aantal prompts | Voorbeeld-prompt (onderwerp "iPhone") |
|-----------|-----------------|----------------------------------------|
| Oriëntatie | 6 | "Waar koop ik het beste een iPhone?" |
| Vergelijking | 6 | "Grote keten of gespecialiseerde winkel voor iPhone-reparatie: wat is beter?" |
| Probleem→oplossing | 6 | "Mijn iPhone-scherm is kapot, waar laat ik dit repareren?" |
| Lokaal/branche | 6 | "Beste iPhone-reparatie in [regio]?" |
| Aanbeveling/keuze | 6 | "Welke iPhone-reparateur in [plaats] is aan te raden?" |

Elke call krijgt hetzelfde Brand DNA als context (inclusief de merknaam als uitsluiting), plus een categorie-specifieke instructie met de harde no-brand-name-regel.

- **Zonder onderwerp:** de 30 prompts dekken samen **alle diensten/producten** die de website aanbiedt (brede dekking, zoals in de oorspronkelijke opzet) — elke categorie-call krijgt dan de volledige Brand DNA zonder topic-restrictie.
- **Met onderwerp:** alle 5 categorie-calls (en dus alle 30 prompts) gaan **uitsluitend over dat onderwerp**, binnen de context van het merk.

**Uitvoering:** de 5 categorie-calls hebben geen onderlinge afhankelijkheid (elk krijgt dezelfde Brand DNA als input) en worden daarom **parallel** afgevuurd, niet na elkaar — dit houdt het voortgangsscherm (§3.7, stap 4) kort.

→ Opslaan in `prompts` (30 rijen totaal, `created_by = 'system'`, elk met `source_raw_json` — nu per categorie herleidbaar naar de specifieke call die 'm genereerde). Zodra alle 5 categorie-calls klaar zijn: `analyses.status = 'concept_klaar'`.

### A2b. Prompt-beheer (CRUD) — ✅ vastgelegd, te allen tijde beschikbaar
Via het tabblad **Instellingen** (zie §3.5) kan de klant, zowel tijdens de verplichte review (A2c) als daarna doorlopend:
- een prompt **toevoegen** (`created_by = 'user'`),
- een bestaande prompt **wijzigen** (tekst/categorie),
- een prompt **verwijderen**,
- een prompt **aan/uit zetten** (pauzeren zonder verwijderen).

Dit gebeurt via eenvoudige CRUD-API-routes (`/api/analyses/[id]/prompts`), geen AI-call nodig. Wijzigingen tellen mee vanaf de eerstvolgende meting (zie §3.5, "vooruitkijkend beheer"). Hetzelfde geldt voor het Brand DNA: bewerken via `/api/analyses/[id]/brand-dna` (PATCH), geen AI-call, zet `brand_dna.edited_by_user = true`.

### A2c. Transparantie & goedkeuring — de verplichte review-gate — ✅ vastgelegd
**Dit is een nieuwe, verplichte stap tussen A2 en A3** (uitgewerkt in §3.6): de pipeline stopt bewust zodra A1+A2 klaar zijn en wacht op de klant.

- **Trigger:** `analyses.status = 'concept_klaar'` (gezet aan het eind van A2).
- **UI:** de klant landt automatisch op het tabblad **Instellingen**, dat nu fungeert als concept-scherm: volledig Brand DNA + volledige prompt-lijst, leesbaar én bewerkbaar (via A2b).
- **Geen AI-call in deze stap** — puur weergave + CRUD op al bestaande data.
- **Afronding:** knop **"Bevestig en start meting."** Bij klik: `analyses.status` gaat van `'concept_klaar'` naar `'meten'`, en **pas dan** start A3.

**Zonder deze bevestiging start A3 nooit** — dit is de harde poort die transparantie garandeert. **Precisering:** halte 1 en 2 (samen ~$0,018, zie §10) draaien al automatisch vóór deze gate om het concept te kunnen tonen — dat is bewust een kleine, geaccepteerde kost om iets te kunnen laten zien. De gate beschermt specifiek tegen de **grote** kostenpost: er wordt nooit de nulmeting (halte 3, ~$0,333, de dure `web_search`-calls op 30 prompts) uitgevoerd op basis van een Brand DNA of prompt-lijst die de klant niet gezien en goedgekeurd heeft.

### A3. Monitoring — nulmeting + optionele 10 weken
**Trigger:** `analyses.status = 'meten'` (pas na de bevestiging in A2c).
**Mechanisme:** voor elke actieve prompt binnen een analyse:

- **3a — De vraag stellen:** OpenAI Responses API-call **met `web_search`-tool aan** — simuleert wat een AI-assistent zou antwoorden als een echte klant die vraag stelt. Resultaat (`raw_response`) wordt **direct opgeslagen** zodra het binnenkomt, vóórdat 3b start.
- **3b — Het antwoord beoordelen:** een tweede, goedkope OpenAI-call (structured output, **geen** `web_search`) beoordeelt het antwoord — **✅ herzien: per entiteit, niet als platte lijst.** Een plat schema (`brandMentioned` + losse `competitorsMentioned[]`/`citedSources[]`) kan niet aangeven welke bron bij welke concurrent hoort — en dat is precies wat 3c en B1 nodig hebben. Daarom:

```ts
const Mention = z.object({
  mentions: z.array(z.object({
    entity: z.string(),                              // merknaam of concurrentnaam
    isOwnBrand: z.boolean(),
    mentioned: z.boolean(),
    position: z.number().nullable(),                 // positie van déze entiteit in het antwoord
    sentiment: z.enum(["positive","neutral","negative"]),
    citedSources: z.array(z.string()),                // bronnen die specifiek déze entiteit onderbouwen
  })),
});
```
→ Opslaan in `tracking_runs` — **volledig**: het ruwe antwoord uit 3a (`raw_response`), de complete structured-output uit 3b (`mention_json`), plus een bevroren snapshot van de prompt-tekst/categorie op dat moment (`prompt_text_snapshot`/`prompt_category_snapshot`, zie §5), en waar mogelijk `openai_response_id`/`tokens_used`/`cost_usd` voor kostenbewaking. **Daarnaast wordt `mentions` genormaliseerd naar aparte rijen in `tracking_run_mentions`** (één rij per entiteit, zie §5) — dit is de tabel waarop 3c en B1 straks rekenen, niet de ruwe JSON. Niets wordt alleen "verwerkt en weggegooid" — zie het vastgelegde principe in §5.

**✅ Vastgelegd — retry-regel (kostenbescherming):** 3a en 3b zijn twee losse, idempotente stappen. Als 3b faalt nadat 3a al succesvol was, wordt **alléén 3b opnieuw geprobeerd** met het al opgeslagen `raw_response` — 3a (de dure `web_search`-call) wordt nooit onnodig herhaald. Dezelfde regel geldt voor A2: als 1 van de 5 categorie-calls faalt, worden **alleen de mislukte categorieën** opnieuw geprobeerd, niet alle 5. Blijft een stap na een paar pogingen mislukken, dan gaat de analyse naar `analyses.status = 'mislukt'` met een retry-knop in "Mijn analyses" (zie §3.4).

**3c — Concurrentie-breakdown berekenen (geen call, herzien/verrijkt):** naast de simpele `visibility_scores` (score 0–100 + share-of-voice, berekend uit `tracking_run_mentions` waar `is_own_brand = true`) berekenen we nu **per concurrent** een aparte uitsplitsing, puur rekenwerk over `tracking_run_mentions` (waar `is_own_brand = false`) — nu dat de data er dankzij het herziene Mention-schema daadwerkelijk voor geschikt is:
- aantal/percentage vermeldingen **per concurrent, per categorie** (zo zie je bijvoorbeeld: concurrent X wint vooral op "Vergelijking"-prompts, jij wint op "Lokaal/branche"),
- de meest-geciteerde bronnen **per concurrent**, nu correct gekoppeld via `tracking_run_mentions.cited_sources` per entiteit — niet meer een dubbelzinnige platte lijst,
- concrete "verloren/gewonnen prompts", opgeslagen als **`tracking_runs.id`-verwijzingen** (`winning_run_ids[]`/`losing_run_ids[]`) zodat de klant later kan doorklikken naar de daadwerkelijke AI-conversatie als bewijs.

→ Opslaan in een nieuwe tabel **`competitor_breakdown`** (zie §5). **Dit is de rijke, structured input die FASE B straks nodig heeft** om een echte, onderbouwde gap-analyse te kunnen maken in plaats van te gokken op basis van ruwe cijfers alleen.

**Batching:** de actieve prompts van een analyse worden in kleine job-batches verwerkt zodat één run niet timeout't en kosten voorspelbaar blijven.

**MVP-versnelling — ✅ vastgelegd:** we tonen de klant meteen een **directe nulmeting (week 0)** zodra de actieve prompts één keer zijn doorlopen, in plaats van 10 weken te wachten. Dit gebeurt altijd, automatisch, voor elke nieuwe analyse (na de bevestiging in A2c). Zodra dit klaar is: `analyses.status = 'gemeten'` **(✅ herzien — niet 'gereed', zie §3.4)**: de score en trendlijn (tab Overzicht) zijn nu zichtbaar, maar het rapport (FASE B) moet nog draaien. Pas wanneer B2 klaar is, gaat de status naar `'gereed'`.

**Wekelijkse lus — ✅ vastgelegd: per analyse aan/uit-schakelbaar.** De 10-weken-trend draait **niet** automatisch door na de nulmeting. Elke analyse heeft `tracking_enabled` (standaard uit), beheerbaar in het tabblad **Instellingen**. De cron verwerkt bij elke wekelijkse run **alleen analyses waar dit aanstaat**. Zo kun je gratis prospect-analyses op de eenmalige nulmeting houden en pas voor betalende klanten (of specifieke analyses) de wekelijkse kosten laten lopen.

---

## 7. FASE B — Adviseren (volautomatisch, per analyse)

**✅ Vastgelegd, herzien: 2 aparte calls in plaats van 1.** Eén enkele call die tegelijk moet uitzoeken *waar concurrenten winnen* én daaruit een leesbaar rapport met aanbevelingen moet schrijven, vraagt te veel van één denkstap — de concurrentie-analyse verdient een eigen, gefocuste call met de rijke `competitor_breakdown`-data (§6, 3c) als input. Beide calls: model **`gpt-4.1-mini`** (zie §2), draaien maar 1× per rapport, dus de meerkosten t.o.v. 1 nano-call zijn ~$0,004/analyse.

### B1. Concurrentie-gap-analyse
**Trigger:** na de nulmeting (of na een latere week), automatisch vóór B2.
**OpenAI-call:** structured output, **geen** `web_search`. Input = `competitor_breakdown` + `visibility_scores` + `brand_dna` — de volledige, per-concurrent uitsplitsing uit halte 3c, niet de ruwe `tracking_runs`.

Het model produceert een gerichte analyse — **✅ herzien: bewijs als ID-verwijzing, niet als losse tekst**, zodat de klant straks kan doorklikken naar de daadwerkelijke AI-conversatie (zie A3, 3c):
```ts
const GapAnalysis = z.object({
  gaps: z.array(z.object({
    competitor: z.string(),
    cluster: z.string(),                     // categorie waar de concurrent wint
    evidence: z.string(),                    // concreet: hoeveel/waarom, welke bronnen
    evidenceRunIds: z.array(z.string()),      // verwijzing naar tracking_runs.id — niet naar losse prompt-tekst
    citedSourcesForCompetitor: z.array(z.string()),
  })),
  strengths: z.array(z.object({              // waar WIJ juist winnen — ook nuttig
    cluster: z.string(),
    evidence: z.string(),
  })),
});
```
→ Opslaan als input voor B2 (niet los in een eigen tabel — het resultaat stroomt direct door).

### B2. Rapport & aanbevelingen
**OpenAI-call:** structured output, **geen** `web_search`. Input = de `GapAnalysis`-output van B1 + `visibility_scores` + `brand_dna`.

Het model produceert het uiteindelijke, leesbare rapport:
```ts
const Report = z.object({
  headlineScore: z.number(),
  summary: z.string(),                    // jargon-vrij, plain-language
  gaps: z.array(z.object({
    cluster: z.string(),
    problem: z.string(),                  // "AI noemt concurrent X, jou niet" — nu onderbouwd door B1
    evidenceRunIds: z.array(z.string()),   // verwijzing naar tracking_runs.id — klant kan doorklikken naar het bewijs
  })),
  recommendations: z.array(z.object({
    title: z.string(),                    // wordt straks een content_piece
    type: z.enum(["article","faq","landing","comparison"]),
    targetIntent: z.string(),
    why: z.string(),                      // waarom dit de gap dicht
    priority: z.number(),                 // 1–3
  })),
});
```
→ Opslaan in `reports` (inclusief `raw_json` van zowel B1 als B2, zie §5). Zodra dit klaar is: `analyses.status = 'gereed'` **(✅ herzien — hier, niet al na A3, zie A3 hierboven)**. Toon in tab **Rapport**: één headline-score, korte samenvatting, top-gaps (nu met concrete concurrent + bewijs), en een lijst aanbevelingen met **"Genereer deze pagina"**-knop.
→ Mail het rapport via **Resend** (jouw acquisitie-stap 5). Eindig altijd met **1–3 priority actions**.

**Tab-beschikbaarheid tussen `gemeten` en `gereed`:** in deze (doorgaans korte) tussenperiode toont het tabblad **Rapport** een simpele status *"Rapport wordt opgesteld…"* in plaats van een lege of foutieve staat — de klant ziet nooit een leeg scherm zonder uitleg.

---

## 8. FASE C — Genereren → Content Bibliotheek (per analyse)

**Trigger — ✅ vastgelegd: pas na klik/goedkeuring door de klant.** De klant klikt bij een aanbeveling op "Genereer deze pagina" (of keurt een batch goed). **Niet** volautomatisch vooraf — dit spaart kosten en geeft de klant controle: er staan alleen aanbevelingen klaar totdat de klant er zelf voor kiest.

**Mechanisme:** elke klik wordt een **job** die één `content_piece` genereert. De cron/queue werkt ze af.

**OpenAI-call per pagina:** structured output, **geen** `web_search`. Input = de aanbeveling + Brand DNA (voor on-brand tone, inclusief het onderwerp indien van toepassing) + de meet-prompts *als thematische inspiratie*. LLM-geoptimaliseerd: *begin met het directe antwoord, heldere koppen, concrete datapunten, FAQ, schema-markup.*

> **🔒 VASTGELEGD — HARDE REGELS voor klant-content (herzien: kwaliteitscorrectie).** De pagina staat op de **eigen website van de klant**, dus: **(1)** noem NOOIT concurrenten bij naam (geen "waarom zijn wij beter dan [concurrent]"-content); **(2)** verzin GEEN specifieke feiten (prijzen, cijfers, productmerken, technieken, openingstijden) die niet uit de context blijken — blijf algemeen-waar i.p.v. plausibel-verzonnen; **(3)** neem de meet-prompts NIET letterlijk over als paginakoppen (die noemen legitiem het merk/concurrenten om te *meten* — dat is geen pagina-inhoud); een **FAQ-pagina** krijgt echte klantvragen (afspraak, diensten, verwachtingen), niet de zoekvragen. Meta-title ≤ 60 tekens, meta-description ≤ 160. Zie `lib/pipeline/content.ts`.

```ts
const ContentPiece = z.object({
  title: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  bodyMarkdown: z.string(),               // volledige pagina in Markdown
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  schemaJsonLd: z.string(),               // klaar om te plakken
  targetIntent: z.string(),
  cluster: z.string(),
});
```
→ Opslaan in `content_pieces` met `status: "ready"`.

### Het tabblad "Content Bibliotheek"
De centrale opleverplek, per analyse. Een lijst kaarten:
- **Kaart** = titel, type-badge (artikel/FAQ/landing/vergelijking), cluster, status, woordaantal.
- **Detail** = leesbare weergave (Markdown → HTML) met knoppen: **Kopiëren**, **Download (.md / .html)**, **Kopieer schema-markup**, en later (Fase D) **Publiceer naar CMS**.
- **Filters** = op cluster / type / status. Simpel, rustig, veel witruimte.
- **Lege staat** (nog niets gegenereerd): duidelijke uitleg *"Ga naar het Rapport en kies welke pagina's je wilt laten schrijven."*

Zo levert de tool op klant-verzoek een **steeds verder gevulde bibliotheek** op, per analyse. Dat is ~80% van Nova's waarde, zonder het CMS-risico en zonder onnodige kosten voor content die niemand vroeg.

---

## 9. End-to-end flow (samengevat, per analyse)

```
0. Klant klikt "+ Nieuwe analyse" → URL + (optioneel) onderwerp ingevuld    status: bezig
1. [eigen crawl, geen call]              → website-tekst
2. [OpenAI mini + web_search]            → Brand DNA (topic-aware)          (A1)
3. [OpenAI mini structured, 5× parallel] → 30 prompts (topic-aware)         (A2)   status: concept_klaar
   -- de 5 categorie-calls hebben geen onderlinge afhankelijkheid en
   -- draaien parallel, niet na elkaar — houdt het voortgangsscherm kort
   ─────────────────── PIPELINE STOPT BEWUST — WACHT OP KLANT ───────────────────
4. [klant ziet + bewerkt]                → Brand DNA + prompts, transparant (A2c)
   [klant, altijd beschikbaar]           → prompts toevoegen/wijzigen/verwijderen (A2b)
5. [klant klikt "Bevestig en start meting"]                                       status: meten
   ────────────────────────── PIPELINE HERVAT ──────────────────────────
6. [cron: OpenAI nano + web_search]      → tracking_runs                    (A3, nulmeting + optioneel wekelijks)
7. [aggregatie, geen call]               → visibility_scores + competitor_breakdown (3c)   status: gemeten
   -- ✅ herzien: score/trendlijn al zichtbaar in Overzicht; Rapport-tab toont
   -- "wordt opgesteld" totdat B1+B2 klaar zijn — 'gereed' komt pas na stap 9
8. [OpenAI mini structured]              → concurrentie-gap-analyse         (B1)
9. [OpenAI mini structured]              → rapport + Resend-mail            (B2)                status: gereed
10. [klant klikt] → [queue: OpenAI mini] → content_pieces                   (C)
11. UI: analyse staat in "Mijn analyses" met status "Gereed",
    Content Bibliotheek vult zich verder ✅
```

Stap 1–3 en 6–9 draaien zonder menselijke tussenkomst. Stap 4–5 (de verplichte review-gate, §3.6/A2c) en stap 10 wachten bewust op de klant. Meerdere analyses draaien volledig onafhankelijk van elkaar, parallel, elk met zijn eigen status.

---

## 10. Kosten & performance

**Geen gratis tier bij OpenAI** — elke call kost vanaf de eerste request geld (in tegenstelling tot Gemini's gratis quota). Dit is een bewuste, vastgelegde keuze; zie §2.

**Belangrijk bij meerdere analyses:** kosten worden nu geteld **per analyse**, niet per klant. Eén klant met 5 analyses (bv. MediaMarkt met "iPhone", "wasmachines", "laptops"...) betaalt 5× de onderstaande nulmeting-kosten, omdat elke analyse zijn eigen volledige Brand DNA + 30 prompts + meting heeft.

**Tarieven:** `gpt-4.1-nano` $0,10 / $0,40 per 1M tokens (in/uit); `gpt-4.1-mini` $0,40 / $1,60 per 1M tokens (in/uit). **`web_search`-tool:** $10 per 1.000 calls + een vaste blok van 8.000 "search content"-tokens per call (afgerekend tegen het input-tarief van het gebruikte model, ongeacht hoeveel er feitelijk gevonden wordt) + normale modeltokens.

> **Let op:** dit zijn indicatieve tarieven op basis van onderzoek dat tussen bronnen uiteenliep. **Controleer `platform.openai.com/pricing`** voor de exacte, actuele tarieven vóór een kostenbegroting op klantschaal. Onderstaande tokenaannames per halte zijn eveneens indicatief (afhankelijk van de uiteindelijke prompt-lengtes).

### Kostenoverzicht stap 1 t/m 9 (nulmeting per analyse — draait altijd automatisch, herzien)

| Halte | Calls | Model | Web-search | Indicatieve in/uit-tokens | Kosten |
|-------|-------|-------|------------|---------------------------|--------|
| 1 · Brand DNA | 1 | mini | Ja | ~10.800 in (incl. 8k search) / ~500 uit | $0,0151 |
| 2 · Prompts (5× per categorie) | 5 | mini | Nee | per call: ~700 in / ~150 uit | $0,0026 |
| 3ab · Nulmeting | 60 (30×2) | nano | 30× | per prompt: 3a ~8.200 in/~400 uit + 3b ~650 in/~100 uit | $0,333 |
| 3c · Concurrentie-breakdown | 0 | — | — | puur rekenwerk | $0,00 |
| B1 · Gap-analyse | 1 | mini | Nee | ~3.000 in / ~800 uit | $0,0025 |
| B2 · Rapport | 1 | mini | Nee | ~1.800 in / ~1.200 uit | $0,0026 |
| **Totaal stap 1–9** | **68** | | **31×** | | **≈ $0,356 per analyse** |

Halte 3ab (de 30-prompt-meting) blijft verreweg de grootste kostenpost: ~94% van de nulmeting, doordat het 60 van de 68 calls omvat waarvan 30 met de dure `web_search`-tool. **De verbeterde promptgeneratie (5× i.p.v. 1×) en de tweeledige rapportage (B1+B2) kosten samen slechts ~$0,006 extra per analyse** t.o.v. de vorige, kariger opgezette versie — een verwaarloosbare meerprijs voor merkbaar betere diversiteit in de prompts en een onderbouwde concurrentie-gap-analyse.

*Noot: als de klant via A2b prompts toevoegt, stijgt het aantal calls in halte 3ab evenredig (elke extra actieve prompt = +2 calls per meting).*

### Stap 10 — content, op aanvraag (buiten de nulmeting)
Alleen bij klant-klik, model **mini**, geen `web_search`: ~1.100 in / ~1.600 uit per pagina → **≈ $0,003 per pagina**. Volledig vraaggestuurd, geen vaste kost.

### Wekelijkse lus — per analyse aan/uit-schakelbaar (buiten de nulmeting)
Zelfde opbouw als halte 3ab: **≈ $0,33/week/analyse**, alleen voor analyses met `tracking_enabled = true`. Over 10 weken continu aan: **≈ $3,33/analyse**. Zie §6 (A3) voor de aan/uit-schakelaar.

**Kostenknoppen (belangrijk bij opschalen):**
1. **`web_search` alleen in halte 1 en 3ab** — nooit aanzetten bij prompts, rapport of content-generatie.
2. **Wekelijkse lus staat standaard uit, per analyse** — gratis prospect-analyses blijven op de eenmalige nulmeting (~$0,35), pas bij betalende klanten (of specifieke analyses) zet je 'm aan.
3. **Cache** Brand DNA en hergebruik; content pas genereren op expliciete klik (al vastgelegd, spaart het meest).
4. **Batch + queue** voorkomt time-outs en maakt kosten per analyse voorspelbaar, ook bij veel analyses tegelijk.
5. **Rate limits bewaken:** instap-tiers bij OpenAI kennen lage RPM-limieten (soms slechts enkele requests/minuut) totdat je account-uitgaven/leeftijd een hogere tier ontgrendelen. Bouw de job-queue met marge, niet ervan uitgaand dat je vanaf dag 1 hoge doorvoer hebt — zeker relevant zodra een klant meerdere analyses tegelijk start.

---

## 11. Bouwvolgorde (sprints)

1. **Sprint 1 — Fundament:** Next.js op Vercel, Supabase-project, Auth, datamodel-migraties (incl. `analyses` met `topic`/`status`, `competitor_breakdown`), officiële `openai` Node-SDK + Zod ingericht, test-calls werkend met zowel `gpt-4.1-nano` als `gpt-4.1-mini` (structured output + `web_search`-tool getest op beide).
2. **Sprint 2 — "Mijn analyses" + A0/A1/A2:** lijst-scherm + "Nieuwe analyse starten"-formulier (URL + onderwerp) + **transparant voortgangsscherm** (§3.7 stap 4) → eigen crawler → Brand DNA (topic-aware, model mini, met `raw_json`) → 30 prompts via **5 aparte categorie-calls** (topic-aware, model mini, elk met `source_raw_json`).
3. **Sprint 3 — Instellingen-tab, A2b + A2c (review-gate):** concept-scherm met volledig Brand DNA + prompt-lijst, beide met volledige CRUD (`/api/analyses/[id]/brand-dna`, `/api/analyses/[id]/prompts`), plus de knop **"Bevestig en start meting"** (`/api/analyses/[id]/confirm`, status `concept_klaar → meten`). **Dit is de belangrijkste UX-sprint** — zonder deze gate mag A3 niet kunnen starten.
4. **Sprint 4 — Fase A3:** cron + job-queue + mention-detectie (model nano) → nulmeting + optionele wekelijkse trend (schakelaar in Instellingen), met volledige opslag (`raw_response`, `mention_json`, prompt-snapshots, zie §5) én de nieuwe **concurrentie-breakdown-aggregatie (3c)** naar `competitor_breakdown`. UI: Overzicht met score + transparant "bezig met meten"-voortgang.
5. **Sprint 5 — Fase B, in twee stappen:** B1 gap-analyse (model mini, input = `competitor_breakdown`) → B2 rapportgeneratie (model mini, input = B1-output) + Resend-e-mail. UI: tab Rapport, met concurrent + bewijs per gap.
6. **Sprint 6 — Fase C:** content-generatie via queue (model mini), getriggerd door klant-klik → `content_pieces` (incl. `raw_json`). UI: tab **Content Bibliotheek** (lijst + detail + kopiëren/download).
7. **Sprint 7 — Polish:** filters, mobiel, kostenlimieten/rate-limit-bewaking, gratis-scan-pagina voor acquisitie.

---

## 12. Vastgelegde keuzes

1. **Engine:** ✅ **Uitsluitend OpenAI**, gedifferentieerd tussen **`gpt-4.1-nano`** (hoogvolume/classificatie) en **`gpt-4.1-mini`** (laagvolume/kwaliteitsgevoelig) — zie §2. Geen Gemini, geen premium modellen. Andere engines komen later als expliciete, aparte uitbreiding.
2. **Eerste rapportervaring:** ✅ **Directe nulmeting (week 0)** meteen tonen, altijd automatisch (stap 1 t/m 9, ≈ $0,356/analyse).
3. **Content-generatie:** ✅ **Pas na klik/goedkeuring** door de klant — niet volautomatisch vooraf. Dit spaart kosten en geeft de klant controle.
4. **Wekelijkse lus (10 weken):** ✅ **Per analyse aan/uit-schakelbaar** (`tracking_enabled`), draait niet automatisch door na de nulmeting.
5. **Onderwerp/product-veld:** ✅ Optioneel naast de website-URL. Bepaalt de scope van zowel Brand DNA (A1) als de 30 prompts (A2). Zonder onderwerp: hele website. Met onderwerp: volledig gescoped op dat segment.
6. **Meerdere analyses per klant:** ✅ Onbeperkt, volledig zelfstandig van elkaar (eigen DNA/prompts/tracking/rapport/bibliotheek/schakelaar). Beheerd via het "Mijn analyses"-scherm.
7. **Prompt-beheer:** ✅ De volledige prompt-lijst is **te allen tijde** door de klant inzichtelijk en beheerbaar (toevoegen, wijzigen, verwijderen, aan/uit) via het tabblad Instellingen. Wijzigingen werken vooruitkijkend, historische metingen blijven ongewijzigd.
8. **Nieuwe analyse starten:** ✅ Kan altijd, op elk moment, onafhankelijk van bestaande analyses, via de knop op "Mijn analyses".
9. **Onderwerp is niet wijzigbaar na start:** ✅ Voor een andere scope start de klant een nieuwe analyse (voorkomt inconsistente Brand DNA/prompts).
10. **Alles opslaan, niets weggooien:** ✅ Elke AI-call slaat zijn volledige ruwe JSON-output op in Supabase (`raw_json`/`mention_json`/`source_raw_json` op de betreffende tabellen), náást de uitgesplitste kolommen. Volledige audit-trail, geen dataverlies bij toekomstige schema-wijzigingen. Zie §5.
11. **Verplichte transparantie- en goedkeuringsstap (review-gate):** ✅ Na A1+A2 (Brand DNA + prompts) stopt de pipeline bewust. De klant ziet en kan het volledige resultaat bewerken (zowel Brand DNA als prompts) en moet expliciet op **"Bevestig en start meting"** klikken vóórdat A3 (de betaalde meting) start. Zie §3.6/A2c.
12. **Brand DNA is bewerkbaar:** ✅ Niet alleen prompts, ook het Brand DNA zelf is door de klant aan te passen (tabblad Instellingen), zowel tijdens de review-gate als daarna doorlopend.
13. **De klantreis is een vaste, benoemde trechter van 9 stappen** (inloggen → Mijn analyses → nieuwe analyse → transparant voortgangsscherm → concept & goedkeuring → transparant meten → score-klaar-rapport-volgt → workspace → altijd terug/nieuw). Zie §3.7 — leidend voor de UI/UX-implementatie.
14. **Prompt-generatie in 5 calls per categorie, niet 1 call voor alle 30:** ✅ Voorkomt herhaling/gebrek aan diversiteit die één grote generatie-call oplevert. Meerkosten ~$0,002/analyse. Zie §6 A2.
15. **Concurrentie-gap-analyse als aparte, eerste call vóór het rapport (B1 → B2):** ✅ Een dedicated call analyseert eerst, met de rijke `competitor_breakdown`-data (§6, 3c), specifiek waar concurrenten winnen en wij niet — met bewijs (categorie, run-verwijzingen, geciteerde bronnen). Pas daarna schrijft een tweede call het leesbare eindrapport. Meerkosten ~$0,004/analyse. Zie §7.
16. **Mention-schema is per-entiteit, niet plat:** ✅ Elke meting (halte 3b) slaat per entiteit (eigen merk + elke concurrent) een eigen rij op (`tracking_run_mentions`, zie §5), inclusief de bronnen die specifiek díe entiteit onderbouwen. Een plat schema met losse `competitorsMentioned[]`/`citedSources[]`-lijsten kan geen "bronnen per concurrent"-analyse leveren — dit is naar aanleiding van een pipeline-review gecorrigeerd vóórdat er gebouwd is. Zie §6 A3 (3b).
17. **Bewijs in rapportages is een ID-verwijzing, geen losse tekst:** ✅ `evidenceRunIds`/`winning_run_ids`/`losing_run_ids` verwijzen naar `tracking_runs.id`, zodat de klant vanuit het Rapport kan doorklikken naar de daadwerkelijke AI-conversatie als bewijs — consistent met het transparantieprincipe (§3.6). Zie §6 (3c) en §7 (B1/B2).
18. **Retry-regel ter kostenbescherming:** ✅ 3a en 3b zijn los herhaalbaar — bij een mislukte 3b wordt nooit opnieuw 3a (de dure `web_search`-call) uitgevoerd. Bij A2 worden alleen mislukte categorie-calls herhaald, niet alle 5. Blijvend falen → `analyses.status = 'mislukt'` met retry-optie. Zie §6 A3.
19. **Status opgesplitst in `gemeten` én `gereed`:** ✅ Naar aanleiding van een UI/UX-review gecorrigeerd — `gereed` betekende voorheen zowel "score klaar" als "rapport klaar" tegelijk, wat tab-beschikbaarheid onduidelijk maakte. Nu: `gemeten` = score/trendlijn zichtbaar (na A3), `gereed` = rapport ook klaar (na B2). Zie §5 (datamodel) en §6/§7.
20. **Schrijfstrategie: nooit rechtstreekse client-writes naar Postgres.** ✅ Alle schrijfacties (ook klant-CRUD zoals prompt-beheer) lopen via Next.js API-routes met de service-role key + expliciete ownership-check. RLS regelt alléén lees-toegang (SELECT, gefilterd op `user_id`/`analysis_id`). Reden: Postgres RLS werkt op rij-niveau, niet op kolom-niveau, en kan dus nooit afdwingen welke specifieke velden een klant mag wijzigen — dat hoort in de API-route thuis. De `jobs`-tabel heeft daarnaast **geen enkele** client-toegang. Zie §5.
21. **Voortgangsschermen zijn server-state-gedreven:** ✅ Alle live voortgangsindicatoren (§3.7, stap 4/6/7) worden afgeleid van `analyses.status` + de `jobs`-tabel, niet van een client-side animatie — zodat een refresh of latere terugkeer altijd de actuele stand toont.
22. **Klantprofiel op accountniveau (i.p.v. Brand DNA per analyse):** ✅ Het grondige, bedrijfsbrede merkonderzoek (merknaam, branche, tone-of-voice, persona's, waardeproposities, algemene concurrenten) gebeurt niet meer per analyse, maar eenmalig bij het aanmaken van een **klantprofiel** (nieuwe tabel `profiles`, accountniveau — een account kan er meerdere hebben, bv. een bureau met meerdere merken). Elke analyse hangt verplicht aan één profiel (`analyses.profile_id`) en het onderwerp (`analyses.topic`) is nu **verplicht** (was optioneel) — zonder onderwerp voegt een analyse niets toe aan wat het profiel al dekt. Halte A1 (Brand DNA) is vervangen door het kleinere, per-analyse **A1'-onderwerp-onderzoek** (`topic_research`-tabel, vervangt `brand_dna`): alleen nog (1) wat de website specifiek zegt over dit product/thema en (2) welke concurrenten relevant zijn voor dít onderwerp. Prompts (A2), meting (A3), rapport (B1/B2) en content-generatie (C) combineren voortaan profiel + onderwerp-onderzoek (concurrenten: gededupliceerde unie van beide lijsten). Bespaart herhaald, identiek bedrijfsonderzoek bij meerdere analyses voor hetzelfde merk. Zie de nieuwe UI-sectie **Klantprofielen** (`/profielen`, los van "Mijn analyses").
23. **Content-inventaris beslist nieuw vs. verbeteren:** ✅ Elk klantprofiel krijgt een zo compleet mogelijke inventaris van bestaande content (`profile_pages`) — eenmalig per profiel, niet per analyse. Ontdekking: `robots.txt` uitlezen voor de sitemap-locatie(s), sitemap-index'en **recursief** volgen, en pas als er echt geen sitemap is → links vanaf de homepage. **Webshop-productpagina's worden uitgesloten** (hele product-sitemaps zoals Shopify `sitemap_products_1.xml` / Yoast `product-sitemap.xml` overslaan, plus losse `/product(s)/`-URL's) omdat het er duizenden kunnen zijn en ze geen zinvol GEO-content-doel zijn; categorie-/`collections`-pagina's blijven wél behouden. We bewaren álle gevonden (niet-product) URL's (tot `MAX_INVENTORY_URLS`), maar halen titel + tekst maar voor een deel op (`CONTENT_FETCH_CAP`) om binnen de 60s-route te passen — het crawlen zelf is API-gratis. Het rapport (B2) beslist per aanbeveling of dit een bestaande pagina verbetert (`action: "verbeteren"`, met `existingUrl`) of een geheel nieuwe pagina vereist (`action: "nieuw"`). Fase C gebruikt bij "verbeteren" de opgeslagen paginatekst als basis om op voort te bouwen i.p.v. vanaf nul te schrijven. Dit blijft een SUGGESTIE (Content Bibliotheek, kopiëren/downloaden) — geen directe CMS-publicatie, dat is expliciet Fase D en nog niet gebouwd.

Nog te bepalen later: aantal analyses/pagina's per klant / eventuele limieten of pakketten.

---

## 13. Wat later komt (D/E/F)

Bewust buiten deze MVP, maar het datamodel is er al klaar voor: `content_pieces` heeft een `status`-veld dat straks naar `published` kan, en een `schemaJsonLd` klaar om te publiceren. Fase D voegt alleen CMS-connectors toe bovenop dezelfde bibliotheek, per analyse. Een tweede LLM-engine (Gemini/Perplexity/Claude) is eveneens een latere, aparte beslissing — niet iets waar deze bouwfase op wacht.
