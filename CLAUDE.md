# ORBIT ENGINE

App van Outer Orbit: GEO-tracking voor het MKB, meet zichtbaarheid van een merk in AI-antwoorden,
adviseert, schrijft en publiceert content, meet effect. Taal van app, prompts en code: Nederlands.

**Bestemming**: `docs/visie.md` (productrichting) en `docs/merkstrategie.md` (merkstrategie) zijn
leidend voor ontwerpkeuzes. Het concrete pad ernaartoe: `docs/tasks/ontwikkelplan-visie.md`.
Kies bij twijfel de oplossing die richting die bestemming beweegt, en zeg het als een opdracht
daarvan afwijkt. **Schrijf nooit dat iets al kan wat nog niet gebouwd is** (UI, commentaar, of in
je antwoord) — `merkstrategie.md` §30 houdt bij waar bouw en belofte uit elkaar lopen.

**Antwoord aan de gebruiker**: altijd Nederlands, begrijpelijk zonder technische kennis (de zin moet
kloppen als je functienamen wegstreept), en zeg het gevolg van een cijfer, niet alleen het cijfer.
Geen gedachtestreepjes (`—`/`–`) en geen "en/of" — overal, ook in code en prompts. Zie
`docs/schrijfstijl.md` §10 voor de uitzonderingen en de grep-check. Alle UI-copy volgt verder
`docs/schrijfstijl.md`, alle vormgeving `docs/designsystem.md`.

**Sales-led, niet self-serve** (`docs/logbook.md` §15): eigenaar zet merkprofiel klaar vóór
demogesprek, pijplijn doet onderzoek, profiel wordt pas ná verkoop aan klantaccount gekoppeld.

**De Sales-module** (`lib/sales/`, `app/(app)/sales/`, `docs/tasks/geo-prospect-engine.md`) is
intern: een klant ziet er niets van, en de scheiding staat in de database en niet alleen in de
schermen. Hij zoekt uit een markt de beste saleskansen, onderbouwt ze en zet een conceptmail klaar.
Twee regels die overal in die module terugkomen: de app verstuurt zelf nooit een openingsmail, en
elk getal in een zin die naar buiten gaat wordt tegen de meetdata gecontroleerd. Eén echte markt is
er op 1 september 2026 doorheen gegaan; de vier blokkerende fouten daaruit zijn gerepareerd, de
verificatiecriteria zijn nog niet gehaald
(`docs/tasks/bevindingen-live-test-sales-1-september-2026.md`).

`main` is productie (Vercel). Werk op een feature-branch.

## Toegang

Volledige lees- en schrijfrechten op Vercel en Supabase via de MCP-tools, geen aparte toestemming
per migratie of query nodig. Wel altijd: migraties additief/idempotent (nooit `drop`), nooit
rechtstreeks schrijven vanaf de client, en bij een echt onomkeerbare actie (data verwijderen,
een branch/project weggooien) eerst afstemmen.

## Techstack

Next.js 15 (App Router, RSC-first) / React 19 / TypeScript, Tailwind v4, Supabase (Postgres, Auth,
RLS, pg_cron), Vercel, OpenAI GPT-5.6 (drie tiers vast in `lib/openai/models.ts`, geen
env-variabele), Zod, Resend (standaard uit, `EMAILS_ENABLED`). Modeltiers en reasoning-effort per
soort werk staan in `lib/openai/sampling.ts`, met de rekensom in `docs/architecture.md` §6.

## Commando's

```bash
npm run dev / build / test:unit / test:chain / test:openai (echte betaalde calls) / eval:mention
npx tsc --noEmit
```

**Vóór elke commit**: `tsc --noEmit`, `test:unit`, `test:chain`, `build` — alle vier groen.

Migraties naar productie via de Supabase MCP-tool (`apply_migration`), niet via de CLI. Werk
daarna de index in `supabase/README.md` bij.

## Code-conventies

Rationale met cijfers per punt staat in `docs/logbook.md`.

1. Elke promptinstructie krijgt een deterministisch vangnet in code, nooit alleen vertrouwen op
   wat het model belooft te doen.
2. Rekenkunde staat in een pure module zonder `server-only`, testbaar vanuit `scripts/test-unit.ts`.
3. Onbekend is een betere waarde dan een verkeerde: onbruikbare modeloutput wordt `null`, nooit 0
   en nooit een gok.
4. Migraties zijn additief en idempotent, nooit `drop`.
5. Commentaar legt het waarom uit, met cijfers.
6. Schrijven loopt nooit rechtstreeks vanaf de client: altijd een API-route met service-role key en
   een expliciete ownership-check.
7. Eén taak is hooguit één zware AI-aanroep; een nieuwe zware stap wordt een eigen jobtype, geen
   uitbreiding van een bestaande.
8. Elke AI-call bewaart zijn volledige ruwe JSON naast de uitgesplitste kolommen, voor de audit-trail.
9. Elke pijplijnstap controleert of zijn resultaat al bestaat vóór een dure call.
10. Gebouwd is niet geverifieerd: een stap is pas af als hij tegen productie of echte opgeslagen
    data is nagerekend.

## Structuur en documentatie

Verken `app/`, `lib/`, `supabase/migrations/` zelf voor de mapstructuur; die is met Glob en Grep
sneller op te zoeken dan uit een boomweergave te lezen. **`README.md` is het startpunt** en zet de
leesvolgorde door de hele documentatieset.

**Eén feit heeft één eigenaar.** Staat het al ergens, verwijs dan, herhaal het niet. Verwijder een
document zodra het niets meer toevoegt, maar grep eerst op de bestandsnaam en ruim verwijzingen
ernaar in dezelfde commit op: code-commentaar en migraties verwijzen op tientallen plekken naar
verwijderde documenten, met bovenaan `docs/logbook.md` de vertaaltabel die zegt waar je in plaats
daarvan moet kijken.

## Hoe je een opdracht aanpakt

De product owner is geen ontwikkelaar; een opdracht komt binnen als een wens, niet als een
specificatie. Zoek daarom eerst uit wat er al staat en waarom (`docs/logbook.md`) voordat je iets
herbouwt. Rust de opdracht op een verkeerde aanname, zeg dat dan eerst in één alinea en bouw
daarna. Vraag alleen wat de uitkomst wezenlijk verandert; anders kies, benoem de keuze, ga door.
Neem een cijfer uit documentatie nooit zonder verificatie over: draai het commando, kijk in de map.

**Werkwijze**: branch vanaf `main`, migratie eerst, dan code, dan UI. Elke wijziging die een
uitkomst beïnvloedt krijgt een test in `test-unit.ts`, elke wijziging in de samenhang tussen taken
een scenario in `test-chain.ts`. Verandert het gedrag, werk dan `docs/` bij in dezelfde commit: een
nieuwe beslissing gaat als alinea met datum en cijfer onderaan `docs/logbook.md`, openstaand werk
naar een eigen bestand in `docs/tasks/` en eruit zodra het af is, een migratie naar
`supabase/README.md`. Kosten zijn een ontwerpvariabele: een meetronde kost ~$0,82 (~95% in de
meting zelf), zet `MEASURE_WEB_SEARCH=false` om goedkoop te ontwikkelen.

**Een onderdeel laten doorlichten**: zeg "start een Teamsessie voor [onderdeel]" — de skill
`.claude/skills/team-session/` selecteert experts uit `.claude/agents/`, laat ze onafhankelijk
onderzoeken en eindigt met hooguit vijf geprioriteerde verbeteringen. Wijzigt nooit code.
