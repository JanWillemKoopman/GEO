# Aura: werkinstructie

**De app heet Aura.** GEO-tracking voor het MKB: meet hoe zichtbaar een merk is in AI-antwoorden
(ChatGPT e.d.), adviseert, schrijft content, publiceert en meet het effect. Nederlands is de taal
van de app, de AI-prompts, de code-commentaren en deze documentatie.

**⚠️ Het antwoord aan de gebruiker is altijd in het Nederlands, en altijd te volgen zonder
technische kennis.** Dit gaat over de samenvatting waarmee Claude Code een vraag of opdracht afsluit,
niet over de code of de commits. Drie regels:

1. **Nederlands**, ook als de vraag deels Engels was.
2. **Begrijpelijk voor de product owner**, die geen ontwikkelaar is. Bestandsnamen, functienamen en
   tabelnamen mogen erin, maar nooit als drager van de betekenis: de zin moet ook kloppen als je die
   namen wegstreept. Dus niet "`getOwnedAnalysis` miste de accountlaag", maar "een uitgenodigde klant
   kon niets goedkeuren, omdat de rechtencontrole zijn account niet meetelde".
3. **Zeg wat het betekent, niet alleen wat er gebeurd is.** Een cijfer zonder gevolg is geen
   informatie. Niet "55 vragen uitgezet", maar "55 vragen uitgezet, waardoor de volgende meting
   alleen nog meet waar deze klant echt kan winnen".

Wat er niet verandert: geen gedachtestreepjes (zie hieronder), geen verkooppraat, en een probleem
wordt benoemd en niet weggeschreven. Begrijpelijk is niet hetzelfde als geruststellend.

**Alle UI-copy volgt `docs/schrijfstijl.md`**: de tone-of-voice van InSpace Nova, vertaald naar
Aura. Kort samengevat: je en jij, korte stellende zinnen, Aura als handelend onderwerp ("Aura leest
je website uit", niet "de website wordt uitgelezen"), en het space-thema uitsluitend in namen en
sfeer-labels, nooit in knoppen, foutmeldingen of instructies. Raadpleeg dat document bij elke
tekstwijziging, net zoals `docs/designsystem.md` leidend is voor de vormgeving.

**⚠️ Geen gedachtestreepjes (`—`, `–`) en geen schuine streep tussen woorden ("en/of").** Dit geldt
overal: UI-copy, promptteksten, code-commentaar en documentatie. Het zijn de twee leestekens waaraan
een lezer AI-tekst herkent, en voor een product dat content schrijft die de klant publiceert is dat
een productfout, geen smaakkwestie. Gebruik een komma, een dubbele punt, of splits de zin.
Richtlijn 10 in `docs/schrijfstijl.md` heeft de volledige regel, de drie functionele uitzonderingen
en twee `grep`-commando's om het vóór een commit te controleren. Regel 9 van de schrijfprompt in
`lib/pipeline/content.ts` legt hetzelfde op aan het model.

**Het product is sales-led, niet self-serve** (besloten 3 augustus 2026, naar het model van
InSpace Nova). De eigenaar zet als consultant het merkprofiel klaar vóór een demogesprek, de
pijplijn doet in ~7,5 minuut het onderzoek, en het uur consultancy gaat over strategie. Pas ná de
verkoop wordt het profiel aan het klantaccount toegewezen. Dat bepaalt hoe schermen ontworpen
worden: de profielpagina is een demo-scherm dat gedeeld wordt, geen formulier. Zie `docs/logbook.md`
§12 voor het waarom en `docs/architecture.md` §11 voor hoe je een klant aanmaakt en koppelt.

**De app staat live.** `main` is de productiebranch (Vercel). Werk op een feature-branch.

## Toegang

Claude heeft volledige lees- en schrijfrechten op **Vercel** en **Supabase** (via de MCP-tools:
`apply_migration`, `execute_sql`, deployments, logs, env-variabelen, etc.) om zelfstandig door te
kunnen ontwikkelen. Geen aparte toestemming nodig per migratie, deploy-check of query. De
bestaande regels blijven wel gelden: migraties additief/idempotent (nooit `drop`), nooit
rechtstreeks schrijven vanaf de client, en bij een echt onomkeerbare actie (data verwijderen,
een branch/project weggooien) eerst expliciet afstemmen.

## Techstack

| Laag | Keuze |
|---|---|
| Runtime | Node.js ≥ 20, Next.js 15 (App Router, RSC-first), React 19, TypeScript |
| Styling | Tailwind v4 (`@theme inline`), tokens in `app/globals.css`, Geist Sans + JetBrains Mono |
| Data & auth | Supabase (Postgres, Auth, RLS, pg_cron) |
| Hosting | Vercel |
| LLM | OpenAI GPT-5.6, drie tiers vast in code (`lib/openai/models.ts`), géén env-variabele |
| Validatie | Zod (`lib/schemas/`) |
| Mail | Resend (standaard uit, `EMAILS_ENABLED`) |

Modeltiers (sinds augustus 2026 de GPT-5.6-familie): `gpt-5.6-luna` doet `volume` én `quality`,
dus classificatie, research en de meting zelf. `gpt-5.6-sol`, het duurste model dat OpenAI levert,
gaat uitsluitend over het schrijven en herschrijven van content. Volume en quality wijzen naar hetzelfde
model; het verschil zit nu in de **redeneerinspanning per soort werk** (`lib/openai/sampling.ts`):
`none` bij classificeren en promptgeneratie, `low` bij onderzoek/rapport, `medium` bij content.

`temperature` is geen vrije knop meer: een redeneermodel accepteert hem alleen bij effort `none`.
Aanroepplekken geven daarom geen temperatuur meer op maar een **soort werk** (`work: "analytical"`);
`resolveTuning()` vertaalt dat naar wat er de deur uit mag. Weigert de API de temperatuur toch, dan
zet `structured.ts` hem voor de rest van het proces uit in plaats van de taak te laten vallen.

## Commando's

```bash
npm run dev              # localhost:3000
npm run build            # productiebuild
npx tsc --noEmit         # typecheck, moet schoon zijn
npm run test:unit        # 1201 tests, pure functies, geen DB/API-key
npm run test:chain       # 160 ketentests, echte handlers tegen echte Postgres, geen netwerk
npm run test:openai      # rooktest, MAAKT ECHTE BETAALDE CALLS
npm run eval:mention     # accuratesse mention-classificatie (vereist API-key)
```

**Vaste controle vóór elke commit:** `npx tsc --noEmit` · `npm run test:unit` ·
`npm run test:chain` · `npm run build`. Alle vier moeten groen zijn.

```bash
supabase link --project-ref <ref>     # eenmalig
supabase db push                      # migraties naar remote
```

Migraties toepassen op productie gaat via de Supabase MCP-tool (`apply_migration`), niet via de
CLI. Werk daarna de index in `supabase/README.md` bij.

## Code-conventies

Deze zijn over acht bouwrondes consequent toegepast. Houd ze aan.

1. **Een promptinstructie is een intentie, code is een garantie.** Elke promptwijziging krijgt
   een deterministisch vangnet in code. Niet theoretisch: het model vulde ondanks een expliciete
   instructie bij 10 van 27 niet-genoemde merken tóch een rol in (structured output kiest bij
   twijfel de eerste enum-waarde). Het vangnet `mention_role: m.mentioned ? m.role : null` ving
   dat af. Zelfde patroon in `normalizePosition()` en de claimvalidator.
2. **Rekenkunde hoort in een pure module, zonder `server-only`.** Alles wat de uitkomst bepaalt
   staat in een apart, importeerbaar bestand (`period-change.ts`, `evidence-format.ts`,
   `validate-claims.ts`, `position.ts`, `question-share.ts`, `content-gate.ts`,
   `claim-extract.ts`). Anders is het niet te testen vanuit `scripts/test-unit.ts`.
3. **Onbekend is een betere waarde dan een verkeerde.** Onbruikbare modeloutput wordt `null`,
   nooit 0 en nooit een gok.
4. **Migraties zijn additief en idempotent**, nooit `drop`. Volledige regels en de index:
   `supabase/README.md`.
5. **Commentaar legt uit wáárom, met cijfers.** "bij Van der Valk was dat 17 van de 30 vragen".
   Dat is de huisstijl; nieuw commentaar volgt hem.
6. **Schrijven loopt nooit rechtstreeks vanaf de client.** Altijd via een API-route met
   service-role key + expliciete ownership-check. RLS is SELECT-only; `jobs` heeft nul policies.
7. **Eén taak = hooguit één zware AI-aanroep** (`lib/jobs/types.ts`). Een nieuwe zware stap wordt
   een eigen jobtype, geen uitbreiding van een bestaande.
8. **Alles bewaren.** Elke AI-call slaat zijn volledige ruwe JSON op náást de uitgesplitste
   kolommen. Volledige audit-trail.
9. **Idempotentie.** Elke pijplijnstap controleert of zijn resultaat al bestaat vóór een dure call.
10. **Gebouwd is niet geverifieerd.** Een stap is pas af als hij op productie of tegen echte
    opgeslagen data is nagerekend, niet als de code er staat.

## Structuur

```
app/(app)/         analyses (dossier in 4 hoofdstukken), profielen, instellingen, beheer (CSM)
app/(auth)/        login/register (server actions)
app/api/           analyses · profiles · accounts · invites · cron (worker/tracking/reminders/plan) · health
components/        gedeelde UI-primitieven (kaarten, chips, rail, skeletons)
lib/pipeline/      elke pijplijnstap: onboarding (discover → offering → topics → markt →
                   kennistest → synthese) → meting → rapport → content → impact
lib/jobs/          achtergrondwachtrij: types, queue, dedupe, handlers, worker
lib/openai/        client, structured output, modellen, sampling/redeneerinspanning, pricing, kostenlogboek
lib/engines/       enginelaag: types, openai, gemini (slapend), registry
lib/search-console/ Google Search Console-koppeling: auth, property, sync, meetvenster
lib/entities/      merknaam-normalisatie en -matching
lib/schemas/       Zod-contracten      lib/stats/  onzekerheidsmarges
lib/audit/         robots.txt / AI-crawlertoegang + entiteitsconsistentie
lib/offsite/       off-site aanwezigheid     lib/archive.ts  wat zichtbaar is in de app
supabase/migrations/  0001-0057 (0033 gereserveerd, nooit gedraaid, vervangen door 0039)
scripts/           test-unit · test-chain · test-openai · eval-mention
```

## Documentatie

| Bestand | Waarvoor |
|---|---|
| `docs/architecture.md` | Datamodel, RLS, jobwachtrij, pijplijn per stap, alle AI-calls, env, deploy, cron |
| `docs/ux-design.md` | Design tokens, componentregels, responsive-strategie, loading/error/lege states |
| `docs/designsystem.md` | Bronanalyse van de live inspace.io-CSS: waar elke kleur, radius en gloed vandaan komt |
| `docs/schrijfstijl.md` | Tone-of-voice en microcopy: de tien richtlijnen, de woordenlijst, en wat we bewust níet van Nova overnemen |
| `docs/logbook.md` | Waarom het is zoals het is: beslissingen en bouwrondes, met de cijfers eronder |
| `docs/Nova.md` | **De richting.** InSpace Nova gereconstrueerd uit hun eigen berichtenbestand, de gap-analyse tegenover Aura, en het bouwplan in acht fases. Bevat de vier vastgelegde besluiten (merk-werkruimte, klantportaal, twaalfmaandsplan, Search Console erbij) |
| `docs/nova-i18n.json` · `docs/inspace-app-i18n.json` · `docs/inspace-marketing.txt` | De ruwe bronnen onder `Nova.md`: de berichtencatalogi van beide InSpace-apps (900 en 1.469 sleutels) en de tekst van hun marketingsite. Niet bewerken |
| `docs/tasks/roadmap.md` | Wat er nog open staat, op volgorde |
| `docs/tasks/lanceerplan.md` | **Het pad naar de lancering.** Vijf testsporen, de vijf eigenschappen die "InSpace-kwaliteit" toetsbaar maken, de tweeweekse planning en de afvinklijst voor het lanceerbesluit |
| `APP_FLOW_DOCUMENTATION.md` | De keten end-to-end voor drie lezersgroepen: sales, developer, AI-specialist. Staat bewust in de hoofdmap, code verwijst ernaar |
| `supabase/README.md` | Migratie-index en toepasinstructies |

**Verwijzingen in code naar oude documenten.** Code-commentaar en migraties verwijzen op ~500
plekken naar `optimalisatie.md`, `implementatieplan.md`, `abcplan.md` en `contentbriefing.md`.
Die bestanden zijn samengevoegd in `docs/logbook.md`; bovenaan dat bestand staat een vertaaltabel
van oude verwijzing naar nieuwe sectie. De originelen staan in de git-historie.

## Werkwijze

- Branch vanaf `main`, migratie eerst, dan code, dan UI.
- Elke wijziging die een uitkomst beïnvloedt krijgt een test in `test-unit.ts`; elke wijziging in
  de samenhang tussen taken een scenario in `test-chain.ts`. Zeven van de zeven fouten van dit
  traject zaten in die samenhang en geen enkele unittest kon ze vangen.
- Verandert het gedrag, werk dan `docs/` bij in dezelfde commit.

**Waar documentatie landt, houd dit aan, anders groeit `docs/` terug naar de oude wildgroei:**

| Wat | Waarheen |
|---|---|
| Een nieuwe beslissing of bouwronde | Alinea onderaan `docs/logbook.md`, met datum en het cijfer dat hem droeg |
| Werk dat nog gebouwd moet worden | Eigen bestand in `docs/tasks/`, met bestanden + verificatiecriteria |
| Taak afgerond | Uit `docs/tasks/` weg, samengevat in `docs/logbook.md` |
| Gedrag van de code veranderd | `docs/architecture.md` of `docs/ux-design.md`, en de peildatum bijwerken |
| Nieuwe migratie | `supabase/README.md` |

Eén feit heeft één eigenaar. Staat het al ergens, verwijs dan, herhaal het niet.
- Kosten zijn een ontwerpvariabele: een meetronde is ~$0,82 (~95% zit in de meting zelf, waarvan
  ~94% in `web_search`). Zet `MEASURE_WEB_SEARCH=false` om goedkoop te ontwikkelen, de meting is
  dan niet representatief.
