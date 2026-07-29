# Contentbriefing — de vragenronde vóór het schrijven

> **Kern in één zin:** vlak nadat de klant heeft gekozen wélke pagina's geschreven moeten worden, en vóórdat er ook maar één zin geschreven wordt, stelt de app een korte, gerichte set vragen over precies díe feiten die het model anders zou verzinnen — en schrijft daarna uitsluitend op basis van bevestigde informatie.
>
> Dit document werkt halte 10 uit `abcplan.md` §8 (FASE C) verder uit. Het vervangt de losse, ongebruikte `fact_requests`-aanpak die tijdens het bouwen ontstond.

---

## 1. Waarom deze stap er moet komen

De eerste echte end-to-end analyse (Van den Udenhout, onderwerp "Private Lease Skoda", 28 juli — volledig nagerekend in [praktijktest-udenhout.md](./praktijktest-udenhout.md)) leverde drie goed geschreven pagina's op. Bij een feitencheck van elke bewering tegen de beschikbare brondata bleek het volgende:

| Bewering in de content | Onderbouwd door |
|---|---|
| All-in vanaf €419,- per maand | ✅ topic research (echte actiepagina) |
| Škoda Scala vanaf €469,- | ✅ topic research |
| Verzekering, wegenbelasting, onderhoud, reparaties, APK inbegrepen | ✅ topic research |
| 4 jaar garantie op werkzaamheden | ✅ `profiles.proof_points` |
| 3670 reviews, gemiddeld 9+ | ✅ `profiles.proof_points` |
| APK €50, binnen een week | ✅ `profiles.proof_points` |
| "Pechhulp inbegrepen" | ❌ **verzonnen** |
| "Vervangend vervoer bij onderhoud of schade" | ❌ **verzonnen** |
| "Schadeherstel inbegrepen in je maandbedrag" | ❌ **verzonnen** |
| "Leasecontracten mogelijk vanaf 24 maanden" | ❌ **verzonnen** |
| "Keuze uit diverse kilometerbundels" | ❌ **verzonnen** |
| "Je kunt kiezen tussen private lease en financial lease" | ❌ **niet geverifieerd** |

Twee dingen vallen op, en samen vormen ze de hele rechtvaardiging van dit ontwerp:

1. **Het model verzint niet willekeurig.** Het verzint precies op de plekken waar een pagina een concreet feit nódig heeft en de brondata het niet levert: contractvoorwaarden, looptijden, wat er wel/niet in het pakket zit. Dat zijn **exact de dingen die de klant zonder nadenken kan beantwoorden.**
2. **De app wist het al.** In `fact_requests` stond op dat moment de open vraag *"Welke specifieke voorwaarden en extra opties biedt Van den Udenhout bij private lease contracten in Tilburg en Eindhoven?"* — onbeantwoord. De content werd toch gegenereerd, met verzonnen antwoorden op precies die vraag.

De huidige `fact_requests` schiet dus op drie punten tekort:

- **Verkeerd moment** — vragen ontstaan bij het rapport (B2), lang vóór bekend is welke pagina's geschreven worden. Ze zijn daardoor vaag en algemeen.
- **Geen consequentie** — een open vraag houdt niets tegen. De generator loopt er straal langsheen.
- **Geen vorm** — het is een open tekstvraag zonder antwoordtype, zonder voorstel, zonder aanduiding hoe belangrijk het is.

**Wat dit oplost, in productwaarde:** de klant heeft interne kennis die nergens op zijn website staat en die dus voor een AI-assistent onzichtbaar is — precieze voorwaarden, aantallen, namen van vestigingen, waarom klanten écht voor hem kiezen. Dat is exact het materiaal waarmee content zich onderscheidt van de generieke lease-vergelijkers die nu wél genoemd worden. **De vragenronde is niet alleen een rem op verzinsels; het is de belangrijkste bron van onderscheidend vermogen die we hebben.**

---

## 2. Waar dit in de flow zit — halte 5b

De app kent al één bewezen patroon hiervoor: de verplichte review-gate tussen halte 2 en 3 (`abcplan.md` §3.6 / A2c), waar de pipeline bewust stopt en op de klant wacht. **De contentbriefing is exact hetzelfde patroon, toegepast op FASE C.** Dezelfde UI-logica, dezelfde statusfilosofie, dezelfde belofte aan de klant: nooit een black box, altijd eerst kijken en bijsturen.

Aangepaste flow (stap 10 uit `abcplan.md` §9 valt uiteen in 10a–10d):

```
 9. [OpenAI mini structured]        → rapport + aanbevelingen                 status: gereed
     ↓
10a. [klant vinkt aan]              → kiest 1..n aanbevelingen uit het rapport
                                       → content_pieces aangemaakt, status: 'briefing'
10b. [OpenAI mini structured]       → claim-audit: wat moet deze pagina beweren,
                                       en wat daarvan weten we níet?           (§3)
                                       → fact_requests (gebundeld, ontdubbeld)
     ─────────── PIPELINE STOPT BEWUST — WACHT OP KLANT ───────────
10c. [klant beantwoordt]            → contentbriefing-scherm, 5–8 korte vragen (§8)
     [klant klikt "Schrijf mijn pagina's"]
     ─────────────────── PIPELINE HERVAT ───────────────────
10d. [queue: OpenAI mini]           → content_pieces geschreven op basis van
                                       de feitenkaart                          (§9)
                                       status: 'ready'
```

**Belangrijk: één briefing voor de hele batch, niet per pagina.** Kiest de klant drie pagina's, dan krijgt hij één vragenlijst waarin overlappende vragen zijn samengevoegd (§3.4). Drie keer los "wat is er inbegrepen?" beantwoorden is precies het soort wrijving dat `README.md` §2 verbiedt.

---

## 3. Hoe de vragen ontstaan

Dit is het hart van het ontwerp. De vragen worden niet bedacht "wat zou handig zijn", maar **afgeleid uit het gat tussen wat de pagina moet beweren en wat we kunnen bewijzen.**

### 3.1 Stap 1 — de feitenindex opbouwen (geen AI-call)

Verzamel alles wat we al zeker weten over deze klant, met bron:

| Bron | Voorbeeld | Betrouwbaarheid |
|---|---|---|
| `topic_research.content_summary` + citaties | "€419 all-in, bron: udenhout.nl/acties/skoda-private-lease" | Hoog — van de eigen site, met URL |
| `profiles.proof_points` | "4 jaar garantie op werkzaamheden" | Hoog — door klant bevestigd |
| `profiles.value_props` / `style_samples` | tone-of-voice-materiaal | Hoog, maar geen feit |
| `profile_pages.text_excerpt` (40 pagina's) | letterlijke sitetekst | Hoog |
| Eerder beantwoorde `fact_requests` | de kennisbank uit §7 | Hoogst — expliciet door de klant gegeven |

Dit is de **feitenindex**: de enige toegestane bron van beweringen over de klant.

### 3.2 Stap 2 — de claim-audit (1 OpenAI-call, mini, structured, geen web_search)

In plaats van meteen een artikel te schrijven, vragen we het model eerst om **de beweringen die het artikel nodig heeft** om de doelvraag geloofwaardig te beantwoorden. Dus: een skelet van claims, geen proza.

Input: de aanbeveling (titel, type, `targetIntent`), de doelprompts uit `content_piece_targets`, het ruwe AI-antwoord van de bijbehorende `tracking_runs` (wat zeggen de winnende concurrenten wél?), en de volledige feitenindex uit §3.1.

```ts
const ClaimAudit = z.object({
  claims: z.array(z.object({
    claim: z.string(),              // "Het maandbedrag is all-in vanaf €419"
    neededFor: z.string(),          // welke doelvraag dit beantwoordt
    supported: z.boolean(),         // gedekt door de feitenindex?
    sourceRef: z.string().nullable(),// welk feit uit de index dit dekt
    importance: z.enum(["kern", "ondersteunend"]),
                                    // kern = zonder dit is de pagina waardeloos
    questionIfMissing: z.string().nullable(),
                                    // de vraag die dit gat zou dichten
    answerType: z.enum(["ja_nee","bedrag","getal","tekst_kort","tekst_lang","keuze","url","lijst"]),
    options: z.array(z.string()),   // bij answerType 'keuze'
    suggestedAnswer: z.string().nullable(),
                                    // ons beste voorstel uit bekende data
  })),
});
```

**Validatie in code, niet door het model** (het model mag zichzelf niet vrijpleiten): voor elke claim met `supported = true` moet `sourceRef` daadwerkelijk naar een bestaand item in de feitenindex verwijzen. Verwijst hij nergens naar, dan wordt de claim alsnog als **onbewezen** behandeld. Zo kan een optimistisch model zich niet uit de audit kletsen.

Elke onbewezen claim → één `fact_request`.

> **Waarom dit werkt — getoetst, niet aangenomen.** De audit is handmatig uitgevoerd op de echte gegenereerde pagina uit de praktijktest. Van de 16 beweringen markeerde hij precies de zes verzonnen claims als onbewezen, plus een feitelijk onjuiste rij in de vergelijkingstabel die bij de handmatige controle pas als laatste opviel. Vier andere claims werden terecht als "aannemelijk maar niet toe te schrijven aan deze klant" gemarkeerd. De volledige uitwerking, inclusief de acht vragen die eruit volgden, staat in [praktijktest-udenhout.md](./praktijktest-udenhout.md) §4.

### 3.3 Stap 3 — vaste slots per contenttype (geen AI-call)

Bovenop de claim-audit staat een kleine, harde checklist per `content_pieces.type`. Deze vangt structurele gaten die een claim-audit mist omdat ze niet over de *inhoud* gaan maar over de *bruikbaarheid* van de pagina:

| Type | Verplichte slots |
|---|---|
| `landing` | Vestigingsadres + telefoonnummer + URL van het aanvraag-/contactformulier, openingstijden |
| `comparison` | Eén eerlijk nadeel of "wanneer past dit níet bij je" (anders is het reclame, en AI-assistenten citeren reclame slechter) |
| `faq` | Per vraag: mag dit hard toegezegd worden, of is het "in overleg"? |
| `article` | Minimaal één eigen cijfer, case of voorbeeld dat niet op de site staat |
| **alle** | Welke bestaande pagina moet hieraan gelinkt worden? (fix voor de verzonnen `existingUrl`, zie §11) |

De `landing`-slots lossen meteen een concrete fout op: de gegenereerde Tilburg-pagina bevatte `"telephone": "+31 "` in de schema-markup — een halve placeholder, en er is geen enkele bron in het systeem waar dat nummer wél uit te halen was.

### 3.4 Stap 4 — bundelen, ontdubbelen, prioriteren (geen AI-call)

1. **Ontdubbelen** op `claim_key` (genormaliseerde claim-tekst). Vragen drie pagina's alle drie naar "wat zit er in het maandbedrag", dan wordt dat één vraag die alle drie de pagina's voedt.
2. **Filteren** tegen de kennisbank (§7): al eerder beantwoord en nog geldig → niet opnieuw stellen, gewoon invoegen.
3. **Sorteren** op impact: `aantal pagina's dat de vraag raakt` × `kern (2) of ondersteunend (1)`.
4. **Afkappen op maximaal 8 vragen per briefing.** Harde grens. Wat er niet in past, blijft `open` staan en komt bij een volgende batch terug. Liever een korte lijst die iemand invult dan een lange die iemand wegklikt — `README.md` §2.

---

## 4. Kwaliteitsregels voor de vragen zelf

Een vragenlijst is alleen waardevol als hij wordt ingevuld. Deze regels zijn niet-onderhandelbaar:

1. **Eén feit per vraag.** Niet: *"Welke voorwaarden en extra opties biedt u in Tilburg en Eindhoven?"* (de vraag die in de echte run onbeantwoord bleef — te groot om te beginnen). Wel: *"Zit pechhulp in het maandbedrag?"*
2. **Beantwoordbaar in maximaal 30 seconden**, zonder iets op te zoeken. Kan het dat niet, splits het of maak het optioneel.
3. **Altijd een voorstel als we er één hebben.** Bevestigen is veel goedkoper dan formuleren: *"Wij lazen op je site: all-in vanaf €419,- per maand. Klopt dat nog?"* → **[Ja] [Nee, het is: ___]**
4. **Geen jargon.** Niet "targetIntent" of "cluster", maar "de vraag waarop deze pagina antwoord geeft".
5. **Altijd zichtbaar wat het oplevert.** Bij elke vraag staat welke pagina('s) er beter van worden, en waarom (het `reason`-veld, in gewone taal).
6. **Nooit vragen wat we al weten.** Elke vraag die de klant beantwoordt terwijl het antwoord in de feitenindex stond, is een geloofwaardigheidsverlies.

---

## 5. De zes vraagsoorten

De claim-audit levert vanzelf verschillende soorten vragen op. Ze worden in de UI gegroepeerd, want dat maakt invullen sneller.

| # | Soort | Wat het ophaalt | Voorbeeld (Udenhout/Skoda) |
|---|---|---|---|
| 1 | **Verificatie** | Bevestiging van wat wij vonden | "All-in vanaf €419,- — klopt dit nog?" |
| 2 | **Aanvulling** | Harde feiten die nergens staan | "Wat is de kortste looptijd die je aanbiedt?" |
| 3 | **Onderscheid** | Waarom jij, en niet de concurrent | "ANWB Lease en Leasen24 worden nu genoemd bij deze vraag. Wat kun jij wat zij niet kunnen?" |
| 4 | **Bewijs** | Cijfers, cases, certificeringen, namen | "Hoeveel Skoda's heb je vorig jaar via private lease geleverd?" |
| 5 | **Praktisch** | Adres, telefoon, formulier-URL, openingstijden | "Naar welke pagina moet de knop 'Offerte aanvragen' linken?" |
| 6 | **Grenzen** | Wat je juist **niet** mag beweren | "Mogen we schrijven dat schadeherstel is inbegrepen?" |

Soort 3 is de meest waardevolle en de meest verwaarloosde. Het is de enige informatie die **principieel** niet uit een crawl of web_search te halen is, en het is precies waar de klant zelf het beste antwoord op heeft. Deze vragen worden gevoed door het ruwe antwoord van de winnende concurrent uit `tracking_runs.raw_response` — we laten dus letterlijk zien wat de AI nu over de concurrent zegt en vragen: wat is jouw antwoord daarop?

Soort 6 is de rem. Standaard geldt: **een claim die niet expliciet is toegestaan, wordt niet geschreven.**

---

## 6. Verplicht, optioneel, en wat er gebeurt bij overslaan

Elke vraag is `required` of niet. `required` = de pagina kan zijn doelvraag niet eerlijk beantwoorden zonder dit feit (`importance: "kern"` uit de audit).

**De regel die alles afdwingt:**

> Een onbeantwoorde vraag leidt er nooit toe dat het model het feit alsnog invult. Het leidt ertoe dat de bewering **wegblijft uit de tekst**.

Concreet per situatie:

| Situatie | Gedrag |
|---|---|
| Alle vragen beantwoord | Pagina wordt normaal geschreven, `status: 'ready'` |
| Optionele vraag overgeslagen | Claim vervalt, pagina wordt geschreven zonder die passage |
| **Verplichte** vraag overgeslagen | Pagina wordt geschreven, maar: de claim vervalt, `needs_review = true`, en er komt een zichtbare regel in `review_notes`: *"Deze pagina noemt de contractlooptijd niet omdat die vraag niet beantwoord is."* |
| Klant klikt "Schrijf met wat je hebt" | Zelfde als hierboven, voor alle openstaande vragen tegelijk |

De klant kan dus **altijd** door — er is geen doodlopende weg, conform `README.md` §2. Maar hij ziet precies wat het overslaan hem kost, en de pagina liegt nooit. De knop "Schrijf mijn pagina's" toont daarom een eerlijke telling: *"3 van de 8 beantwoord — je pagina's worden geschreven zonder informatie over looptijd, pechhulp en vervangend vervoer."*

---

## 7. De kennisbank — één keer vragen, altijd hergebruiken

Antwoorden worden opgeslagen op het **laagst passende niveau**, zodat een tweede analyse niet opnieuw begint bij nul:

| Scope | Geldt voor | Voorbeeld |
|---|---|---|
| `merk` | alle analyses van deze klant, voor altijd | telefoonnummer, adres, garantievoorwaarden, wat je niet mag claimen |
| `analyse` | deze analyse (dit onderwerp) | "wat zit er in het Skoda private lease-pakket" |
| `pagina` | dit ene content_piece | "naar welke pagina moet de CTA linken" |

De claim-audit bepaalt de scope; bij twijfel wint de bredere scope (liever één keer te veel hergebruiken dan één keer te veel vragen).

**Veroudering.** Prijzen en voorwaarden verlopen. Feiten met een bedrag of looptijd krijgen `verify_after` (standaard 6 maanden). Verlopen feiten worden niet weggegooid maar teruggezet als **verificatievraag** met het oude antwoord als voorstel — één klik op "Ja, nog steeds correct". Zo blijft de kennisbank vanzelf actueel zonder dat het ooit als werk voelt.

**Dit is op termijn het waardevolste bezit in de app.** Na drie analyses heeft een klant een gevulde feitenbank, en wordt elke volgende pagina beter én sneller geschreven dan de vorige. Dat is een reden om te blijven die geen enkele concurrent uit `concurrenten.md` biedt.

---

## 8. Het briefingscherm

Eén scherm, in de stijl van het bestaande concept-scherm uit §3.6. Geen wizard, geen stappen.

```
┌──────────────────────────────────────────────────────────────┐
│  Nog even dit, dan schrijven we je pagina's                   │
│  Je hebt 3 pagina's gekozen. Deze 6 vragen zorgen dat er      │
│  alleen kloppende informatie in komt te staan.                │
│                                                               │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░  4 van de 6 beantwoord                     │
│                                                               │
│  ── Even bevestigen ────────────────────────────────────────  │
│  Op je site staat: all-in vanaf €419,- per maand.             │
│  Klopt dat nog?                                               │
│     ( ) Ja      ( ) Nee, het is: [________]                   │
│     ℹ Verbetert: alle 3 de pagina's                           │
│                                                               │
│  ── Wat wij niet kunnen weten ──────────────────────────────  │
│  Zit pechhulp in het maandbedrag?                    ⚑ nodig  │
│     ( ) Ja   ( ) Nee   ( ) Alleen bij bepaalde pakketten      │
│     ℹ Verbetert: "Voordelen private lease", "Tilburg"         │
│                                                               │
│  Wat kun jij wat ANWB Lease en Leasen24 niet kunnen?  ⚑ nodig │
│     [_________________________________________________]        │
│     ℹ ChatGPT noemt nu die twee bij deze vraag, jou niet.     │
│                                                               │
│  ── Praktisch ──────────────────────────────────────────────  │
│  Telefoonnummer vestiging Tilburg?                   ⚑ nodig  │
│     [_________________________________________________]        │
│     ℹ Nodig voor de Google-vermelding van de Tilburg-pagina   │
│                                                               │
│         [ Schrijf mijn pagina's ]   [ Later verder ]          │
└──────────────────────────────────────────────────────────────┘
```

Ontwerpregels:
- **Gegroepeerd op vraagsoort** (§5), met menselijke kopjes — niet "Verificatie" maar "Even bevestigen".
- **⚑ nodig** markeert `required`. Geen rode foutmeldingen; de knop blijft altijd klikbaar.
- **Antwoordtype bepaalt de invoer**: ja/nee wordt een radio, bedrag een numeriek veld met €, keuze een radiogroep, URL een veld met validatie. Vrije tekst alleen als het echt niet anders kan.
- **"Later verder"** slaat op zonder te genereren; de pagina's blijven op `status: 'briefing'` staan in de Content Bibliotheek met het label *"wacht op jouw input"*.
- Styling volgt `designsystem.md`.

**Bulk-alternatief (fase 2, niet MVP):** een veld *"Of plak hier je leasevoorwaarden / productbrochure"*. Eén extra mini-call haalt daar de antwoorden uit en vult de vragen vooraf in, die de klant dan alleen nog bevestigt. Voor klanten die alles al in een PDF hebben staan is dat het verschil tussen 8 vragen en 8 keer "ja".

---

## 9. Het schrijfcontract — hoe de antwoorden de content in komen

De generator uit `abcplan.md` §8 verandert op één punt fundamenteel: hij krijgt geen vrije context meer, maar een **feitenkaart** — een gesloten lijst toegestane beweringen, elk met bron.

```
FEITENKAART (de enige toegestane bron van beweringen over deze klant)
─────────────────────────────────────────────────────────────────────
F1  All-in vanaf €419,- per maand        bron: site /acties/skoda-private-lease
F2  Inbegrepen: verzekering, wegenbelasting,
    onderhoud, reparaties, APK            bron: site /acties/skoda-private-lease
F3  4 jaar garantie op werkzaamheden      bron: klant, bevestigd 29-07
F4  3670 reviews, gemiddeld 9+            bron: klant, bevestigd 29-07
F5  Pechhulp: NIET inbegrepen             bron: klant, briefing 29-07
F6  Kortste looptijd: 12 maanden          bron: klant, briefing 29-07
F7  Onderscheid t.o.v. vergelijkers:
    eigen werkplaats in 4 vestigingen,
    auto ophalen zonder afspraak          bron: klant, briefing 29-07
─────────────────────────────────────────────────────────────────────
```

Bijbehorende instructie-regels bij de content-call:

1. Elke feitelijke bewering over deze klant moet herleidbaar zijn tot een F-nummer.
2. Staat iets niet op de kaart, dan schrijf je er niet over. **Niet gladstrijken, niet aannemen, niet "logisch invullen".**
3. Feiten met `NIET`-status zijn een verbod: schrijf het niet, ook niet impliciet of in een FAQ.
4. Generieke uitleg over het onderwerp (hoe private lease in het algemeen werkt) mag zonder F-nummer, zolang er geen belofte van deze klant in zit.

**Traceerbaarheid vastleggen.** De content-call levert naast de tekst ook een `claims_json` op: per bewering het F-nummer dat 'm dekt. Nieuwe kolom op `content_pieces`. Dat maakt drie dingen mogelijk die nu ontbreken:

- **een echte kwaliteitsscore** — percentage beweringen met bron, in plaats van de huidige `geo_score` die voor alle drie de pagina's 100 gaf en dus niets meet;
- **hergeneratie bij nieuwe feiten** — beantwoordt de klant later alsnog een vraag, dan weten we exact welke pagina's daardoor beter kunnen;
- **controleerbaarheid** — bij een klacht is per zin aanwijsbaar waar hij vandaan komt.

---

## 10. Datamodel

`fact_requests` wordt uitgebreid (bestaande kolommen blijven, cursief = nieuw):

```
fact_requests    id, profile_id, analysis_id(nullable), question, reason,
                 answer, status, answered_at, created_at,
                 scope ('merk'|'analyse'|'pagina'),
                 content_piece_ids[],      -- welke pagina's beter worden van dit antwoord
                 kind ('verificatie'|'aanvulling'|'onderscheid'
                       |'bewijs'|'praktisch'|'grenzen'),
                 answer_type ('ja_nee'|'bedrag'|'getal'|'tekst_kort'
                       |'tekst_lang'|'keuze'|'url'|'lijst'),
                 options[],                -- bij answer_type 'keuze'
                 suggested_answer,         -- ons voorstel uit de feitenindex
                 required(bool, default false),
                 claim_key,                -- ontdubbelsleutel (§3.4)
                 fact_ref,                 -- F-nummer op de feitenkaart
                 verify_after(date, null), -- veroudering (§7)
                 raw_json                  -- volledige claim-audit-output

content_pieces   ... bestaand ...,
                 claims_json,              -- bewering → F-nummer (§9)
                 briefing_snapshot_json    -- de feitenkaart zoals gebruikt bij
                                           -- het schrijven (bevriezen, net als
                                           -- prompt_text_snapshot in §5)
```

`content_pieces.status` krijgt één waarde erbij: **`briefing`** (gekozen, wacht op input) → `draft` → `ready`.

`analyses.status` verandert **niet**. De briefing hangt aan het content_piece, niet aan de analyse — een klant kan tegelijk de ene pagina laten schrijven en de andere in briefing hebben staan.

`briefing_snapshot_json` volgt hetzelfde principe als `prompt_text_snapshot` (`abcplan.md` §5): wijzigt de klant later een feit in de kennisbank, dan blijft achterhaalbaar op basis van welke feiten de bestaande pagina destijds geschreven is.

**Schrijfstrategie** conform §5: de klant schrijft antwoorden **nooit** rechtstreeks naar Postgres, altijd via `POST /api/analyses/[id]/briefing` (service role + ownership-check). Die route mag uitsluitend `answer`, `status` en `answered_at` zetten — nooit `question`, `required` of `fact_ref`.

---

## 11. Wat dit náást verzinsels nog oplost

De briefing raakt drie andere gebreken uit de Udenhout-run:

| Probleem | Hoe de briefing het oplost |
|---|---|
| `existingUrl` was verzonnen (`/udenhout.nl/skoda`), terwijl de echte pagina al bekend was uit de topic research | Vaste slot-vraag (§3.3): *"Welke bestaande pagina hoort hierbij?"* met de gevonden URL als voorstel |
| Titels waren instructies (*"Maak een overzichtelijke pagina met…"*) in plaats van koppen | De briefing toont de voorgestelde paginatitel als bevestigingsvraag — de klant ziet en corrigeert 'm vóór het schrijven |
| `"telephone": "+31 "` in de schema-markup | Praktisch-slot vraagt het nummer uit; zonder antwoord blijft het veld wég uit de markup in plaats van half gevuld |

---

## 12. Kosten

| Onderdeel | Calls | Model | Kosten |
|---|---|---|---|
| Claim-audit (per batch, niet per pagina) | 1 | mini | ~$0,002 |
| Bundelen/ontdubbelen/prioriteren | 0 | — | $0,00 |
| Content-generatie (ongewijzigd) | 1 per pagina | mini | ~$0,003 p/pagina |

**Netto effect op de kostenbegroting van `abcplan.md` §10: verwaarloosbaar** — ongeveer $0,002 per contentbatch, ongeacht het aantal pagina's. Er komt geen `web_search` bij (kostenknop 1 blijft intact).

Er is zelfs een besparing: pagina's die nu weggegooid en opnieuw gegenereerd moeten worden omdat er onzin in staat, kosten per stuk meer dan de hele audit.

---

## 13. Bouwvolgorde

Klein te beginnen, met de grootste winst eerst:

1. **Feitenindex + feitenkaart-contract** (§3.1, §9). Zelfs zónder vragenronde stopt dit alleen al het verzinnen, omdat het model dan niets meer mag beweren buiten de index. *Grootste winst, kleinste ingreep.*
2. **Claim-audit + `fact_requests` uitgebreid** (§3.2, §10). Vragen worden gegenereerd en opgeslagen, nog zonder scherm.
3. **Briefingscherm + gate** (§8, §6). De klant kan beantwoorden en de generatie wacht erop.
4. **Kennisbank: scope, hergebruik, veroudering** (§7).
5. **`claims_json` + kwaliteitsscore op bronnendekking** (§9) — vervangt de huidige niet-discriminerende `geo_score`.
6. **Bulk-invoer via geplakte tekst** (§8, fase 2).

Stap 1 en 2 zijn samen een halve dag werk en vangen naar schatting het grootste deel van de fouten uit §1 af. Stap 3 maakt er een product van.

---

## 14. Vastgelegde uitgangspunten

- ✅ **De briefing komt ná de keuze van pagina's, vóór het schrijven** — anders zijn de vragen te algemeen om nuttig te zijn.
- ✅ **Vragen worden afgeleid uit onbewezen claims**, niet uit een vaste vragenlijst — dat is wat ze scherp en kort houdt.
- ✅ **Eén briefing per batch, maximaal 8 vragen**, ontdubbeld over de gekozen pagina's.
- ✅ **Een onbeantwoorde vraag laat de bewering vervallen; het model vult nooit zelf aan.**
- ✅ **De klant kan altijd doorklikken zonder te antwoorden**, en ziet eerlijk wat dat kost.
- ✅ **Antwoorden zijn merk-breed herbruikbaar** en verlopen automatisch als het om prijzen/voorwaarden gaat.
- ✅ **Elke bewering in de content is herleidbaar tot een F-nummer op de feitenkaart.**

---

*Dit document hoort bij [abcplan.md](./abcplan.md) §8 (FASE C) en volgt de UI-uitgangspunten uit [README.md](./README.md) §2 en de vormgeving uit [designsystem.md](./designsystem.md).*
