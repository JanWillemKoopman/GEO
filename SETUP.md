# SETUP — GEO Tracker (developer-handleiding)

De inhoudelijke visie staat in [`README.md`](./README.md), het technische plan in
[`abcplan.md`](./abcplan.md) en de vormgeving in [`designsystem.md`](./designsystem.md).
Dit bestand beschrijft hoe je de app lokaal draait en deployt.

> **Status:** de app is voorbij het MVP — profiel-onboarding, de volledige
> meet→advies→content-pijplijn, een achtergrond-jobqueue, technische GEO-audit
> en off-site-scanning draaien allemaal. Zie [`optimalisatie.md`](./optimalisatie.md)
> voor wat er ná de MVP is bijgebouwd en wat eventueel nog openstaat.

## Wat er nu staat

```
app/
  (auth)/                  login/register (Supabase e-mail+wachtwoord), server actions
  profielen/                Profielen: account-brede merkkennis (1x onderzoek per klant)
    [id]/                   detail: research, entiteiten, feiten, hiaten
    nieuw/                  onboarding-wizard (nieuw profiel aanmaken)
  analyses/                 Analyses: een getrackt onderwerp/product, hangt aan één profiel
    [id]/                   tabs: Overzicht · Antwoorden · Rapport · Bibliotheek · Instellingen
    new/                    nieuwe analyse (kiest/maakt eerst een profiel)
  api/
    profiles/                profiel-CRUD + research, refresh-inventory, status, entities, facts
    analyses/                analyse-CRUD + confirm, prepare, measure, report, generate(-all),
                              tracking, topic-research, costs, prompts, content(/publish)
    cron/                    worker · tracking · reminders (zie §6b)
    health/                  env-status check
  layout.tsx, globals.css    lichte InSpace-huisstijl (zie designsystem.md)
lib/
  env.ts, config.ts          gevalideerde env-toegang + modelkeuze
  auth.ts                    requireUser() / getUser()
  supabase/                  client (browser) · server (sessie) · admin (service-role)
  openai/                    client, structured-output helper, modellen, pricing, kostenlogboek
  entities/                  merknaam-normalisatie + -matching (dedupliceert varianten)
  audit/                     technische GEO-audit (robots.txt, AI-crawler-toegang) — geen AI-calls
  offsite/                   off-site aanwezigheid: bronnenlandschap, presence-check, entity-presence
  pipeline/                  alle pijplijn-stappen (profiel-research t/m content t/m impact-meting)
  jobs/                      achtergrond-wachtrij: types, queue, handlers, worker
  schemas/                   alle Zod-contracten
  stats/                     onzekerheidsmarges / betrouwbaarheidsbanden
  types/database.ts          TypeScript-datamodel
supabase/migrations/        0001 t/m 0023 (zie supabase/README.md) + RUN_*.sql-bundels
scripts/
  test-unit.ts               npm run test:unit — pure functies, geen DB/API-key nodig
  test-openai.ts             npm run test:openai — rooktest, echte (betaalde) OpenAI-calls
  eval-mention.ts            npm run eval:mention — accuratesse mention-classificatie, nano vs mini
```


## 1. Vereisten

- **Node.js ≥ 20**
- Een **Supabase**-project (gratis tier volstaat om te bouwen)
- Een **OpenAI**-API-key met toegang tot `gpt-4.1-nano`, `gpt-4.1-mini` én `gpt-4.1`
  (het volle model wordt alleen gebruikt om content te schrijven/herschrijven, `lib/openai/models.ts`)
- Optioneel: een **Resend**-key — alleen nodig als je de mail aanzet
  (`EMAILS_ENABLED=true`); tijdens het bouwen staat alle uitgaande mail uit

## 2. Installeren

```bash
npm install
```

## 3. Omgevingsvariabelen

```bash
cp .env.example .env.local
```

Vul in `.env.local` in:

| Variabele | Waar vind je 'm |
|-----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | idem → `service_role` secret (**server-only!**) |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `EMAILS_ENABLED` | Hoofdschakelaar voor álle uitgaande mail. Standaard `false` (aanbevolen tijdens bouwen), zie §7b |
| `RESEND_API_KEY` | resend.com (alleen nodig bij `EMAILS_ENABLED=true` — anders wordt er sowieso niets verstuurd, zie §7b) |

De OpenAI-modelkeuze staat **vast in de code** (`lib/openai/models.ts`), niet als
env-variabele — drie tiers: `gpt-4.1-nano` (hoogvolume/classificatie), `gpt-4.1-mini`
(kwaliteitsgevoelig: research, prompts, rapport, redactie-kritiek) en `gpt-4.1` (vol,
uitsluitend voor het schrijven/herschrijven van content-pagina's).

## 4. Database opzetten

Pas **alle** migraties toe op je Supabase-project (zie [`supabase/README.md`](./supabase/README.md)
voor de volledige lijst, 0001 t/m 0023):

```bash
supabase link --project-ref <jouw-project-ref>
supabase db push
```

### Zonder Supabase-CLI — de RUN_*.sql-bundels

`0001_init.sql` en `0002_rls.sql` plak je los in de SQL Editor. Migraties 0012 t/m 0023
(alles uit het optimalisatietraject) staan ook als samengevoegde bestanden klaar, zodat
je ze zonder CLI kunt plakken. **De volgorde is niet vrij** — elk bestand bouwt voort op
het vorige en op 0003 t/m 0011 (klantprofielen, prompt-taxonomie, gewogen zichtbaarheid,
content-brief — die hebben geen RUN-bundel, gewoon los toepassen in volgorde):

| Volgorde | Bestand | Wat het toevoegt |
|---|---|---|
| 1 | `RUN_0012_TOT_0017.sql` | Kostenlogboek, wachtrij, e-mailkeuze, meetkwaliteit, volumebanden |
| 2 | `RUN_0018_EN_0019.sql` | Technische GEO-audit; doelvragen, versies, GEO-score, feitenvragen |
| 3 | `RUN_0020.sql` | Publicatiestatus, hermetingen, gemeten effect |
| 4 | `RUN_0021.sql` | Rapport per periode, verandering, mailstatus |
| 5 | `RUN_0022.sql` | Bronnenlandschap, off-site taken, entiteitsaanwezigheid |
| 6 | `RUN_0023.sql` | Eén actuele content-versie per pagina/titel afgedwongen op DB-niveau |

Drie dingen om te weten:

* **In bestand 1 moet STAP 3 apart.** `alter type ... add value` mag in Postgres niet in
  dezelfde transactie gebruikt worden als waarin je hem toevoegt, en de SQL Editor draait je
  selectie als één transactie. Selecteer die ene regel en voer hem los uit.
* **STAP 7 in bestand 1 is optioneel** — alleen nodig als je de werker vanuit Postgres wilt
  aansturen in plaats van via Vercel Cron (zie §6b). Zet vooraf de twee Vault-geheimen.
* **Herhalen is veilig.** Overal staat `if not exists`; er wordt niets verwijderd of
  overschreven. Onderaan elk bestand staat een controle-query die alles op `t` hoort te zetten.

## 5. Verifiëren

```bash
# Fundament compileert?
npm run build

# OpenAI werkt (beide modellen + web_search)? ⚠️ maakt echte, betaalde calls (paar cent)
npm run test:openai

# Draaien
npm run dev        # → http://localhost:3000
```

De statuspagina op `/` laat direct zien welke env-variabelen gezet zijn.

## 5b. Toegang afsluiten tijdens de bouwfase (alleen jij)

Tijdens het bouwen mag alleen de eigenaar de app gebruiken — geen publieke
registratie. Dit regel je op **twee lagen**:

**Laag 1 — Supabase (de harde poort, essentieel).**
De anon-key staat in de browser, dus zonder deze stap kan iemand de Supabase-API
rechtstreeks aanroepen om een account te maken, buiten onze UI om.
1. **Authentication → Sign In / Providers** (of **Providers → Email**) → zet
   **"Allow new users to sign up"** **UIT**.
2. Maak je eigen account aan via **Authentication → Users → Add user**
   (e-mail + wachtwoord, vink "Auto Confirm User" aan). Dit is je login.

**Laag 2 — de app (net & reversibel).**
De env-variabele `SIGNUPS_ENABLED` staat standaard op `false`: de registratie-UI
is dan verborgen en de registratie-actie weigert. Laat 'm op `false` (of laat 'm
weg) tijdens het bouwen.

**Bij lancering later:** zet Supabase's "Allow new users to sign up" weer AAN én
`SIGNUPS_ENABLED=true` in Vercel. Meer niet.

## 6. Deployen naar Vercel

1. Push naar GitHub (`main`, of importeer een feature-branch als Vercel-preview).
2. Importeer de repo in Vercel — Next.js wordt automatisch herkend.
3. Zet dezelfde env-variabelen in **Project → Settings → Environment Variables**
   (let op: `SUPABASE_SERVICE_ROLE_KEY` is server-only, geen `NEXT_PUBLIC_`).
4. Deploy. Check `/api/health` om te bevestigen dat alles geconfigureerd is.

## 6b. Cron-taken activeren

Er zijn er drie, allemaal beveiligd met `CRON_SECRET`. Let op **wie ze aanstuurt**
— dat is niet voor alle drie hetzelfde:

| Taak | Pad | Schema | Aangestuurd door | Waarvoor |
|---|---|---|---|---|
| **Werker** | `/api/cron/worker` | elke minuut | **Supabase pg_cron** (migratie 0015) | Werkt de wachtrij af: onderzoek, meting, rapport, content. **Zonder deze taak gebeurt er niets.** |
| Terugkerende meting | `/api/cron/tracking` | maandelijks, de 1e om 06:00 UTC | Vercel (`vercel.json`) | Plant een nieuwe meting in voor analyses met de tracking-schakelaar aan. |
| Rapport-e-mail | `/api/cron/reminders` | wekelijks, maandag 09:00 UTC | Vercel (`vercel.json`) | Stuurt het periodieke rapport en de publicatieherinnering. |

> ⚠️ **Zet de werker NIET in `vercel.json`.** Het Hobby-plan staat maximaal twee
> cron-taken toe en die mogen ten hoogste één keer per dag lopen. Een regel met
> `"schedule": "* * * * *"` laat de **deployment falen** — niet de cron, de hele
> build. Dat is precies wat er in fase 1 gebeurde. De werker hoort daarom in
> pg_cron; de twee taken hierboven passen wél binnen de Hobby-grenzen (twee
> stuks, beide minder vaak dan dagelijks).

1. Genereer een geheim: `openssl rand -hex 32`.
2. Zet dat als `CRON_SECRET` in Vercel (Environment Variables) en redeploy.
   Vercel Cron stuurt het automatisch mee als `Authorization: Bearer <secret>`
   wanneer de env-variabele exact zo heet.
3. Vercel pikt `vercel.json` op bij de eerstvolgende deploy (**Project → Cron
   Jobs** om te bevestigen).
4. **Handmatig testen:**
   ```bash
   curl -H "Authorization: Bearer <jouw-CRON_SECRET>" https://<jouw-url>/api/cron/worker
   curl -H "Authorization: Bearer <jouw-CRON_SECRET>" https://<jouw-url>/api/cron/tracking
   ```

### De werker: eenmalige setup in Supabase

Migratie `0015_worker_cron_via_pg_cron.sql` laat Supabase de werker elke minuut
aanroepen via `pg_cron` + `pg_net`. Die migratie alleen is **niet genoeg** — zet
in de SQL-editor ook de twee Vault-geheimen:

```sql
select vault.create_secret('https://jouw-app.vercel.app', 'geo_site_url');
select vault.create_secret('<dezelfde waarde als CRON_SECRET>', 'geo_cron_secret');
```

Zonder die twee slaat `trigger_worker()` stil over: geen fout in de logs, maar
ook geen enkele taak die verwerkt wordt. Controleren:

```sql
select * from cron.job;                                            -- staat 'geo-worker' erin?
select name from vault.decrypted_secrets where name like 'geo_%';   -- staan beide geheimen er?
select * from cron.job_run_details order by start_time desc limit 10;
```

## 7b. E-mail (staat tijdens het bouwen UIT)

De app kan twee soorten mail sturen via Resend:

| Mail | Wanneer | Code |
| --- | --- | --- |
| Rapport klaar | na B1+B2, als de analyse op `gereed` gaat | `lib/email/report-email.ts` |
| Publicatie-herinnering | wekelijkse cron, één keer per analyse | `lib/email/publish-reminder.ts` |

**Beide staan standaard uit.** `EMAILS_ENABLED` is de hoofdschakelaar; zolang
die niet expliciet op `true` staat, gebeurt er dit:

- geen rapport-mail, en `reports.emailed_at` blijft leeg (dat veld moet blijven
  kloppen — anders lijkt er later een mail verstuurd die er nooit was);
- geen herinnering, en `analyses.publish_reminder_sent_at` blijft leeg, zodat de
  éénmalige herinnering niet stil opgebrand wordt aan een mail die nooit ging;
- de reminder-cron stopt meteen en antwoordt `{ "skipped": "emails_disabled" }`;
- het vinkje *"Mail me zodra het rapport klaar is"* verdwijnt uit het
  nieuwe-analyse-formulier.

De rapporten zelf blijven gewoon zichtbaar in de app op het tabblad Rapport —
alleen het verzenden ligt stil.

De schakelaar staat **los van** `RESEND_API_KEY`. Je kunt de sleutel dus vast in
Vercel zetten zonder dat er iets de deur uit gaat; dat is precies de bedoeling
op een gratis Resend-account, waar elke mail er één van een klein maandbudget is.

### Aanzetten, later

1. Maak een gratis account op [resend.com](https://resend.com) en een API-key.
2. Zet `RESEND_API_KEY` in Vercel. `RESEND_FROM_EMAIL` mag je laten staan op
   het Resend-testadres (`onboarding@resend.dev`) totdat je een eigen domein
   verifieert bij Resend.
3. Zet `EMAILS_ENABLED=true` in Vercel (en/of in `.env.local`).
4. Wil je ook de publicatie-herinnering terug, zet de cron dan terug in
   `vercel.json` — hij is eruit gehaald omdat hij alleen bestaat om te mailen,
   en een gratis Vercel-account maar een paar cron-jobs toestaat:
   ```json
   { "path": "/api/cron/reminders", "schedule": "0 9 * * 1" }
   ```
5. Redeploy. Controleer via `/api/health`: daar staat `emailsEnabled` bij.

## Architectuurprincipes (kort, uit `abcplan.md`)

- **Schrijven altijd via API-routes** met de service-role key + ownership-check.
  Nooit rechtstreeks vanuit de browser naar Postgres (§5/§12.20).
- **RLS = SELECT-only**; `jobs` heeft geen client-toegang.
- **We bewaren alles**: elke AI-call slaat zijn volledige ruwe JSON op naast de
  uitgesplitste kolommen (§5).
- **web_search alleen waar nodig**: profiel-research, onderwerp-research en de meting
  gebruiken het; prompt-generatie en het rapport niet. Content-generatie gebruikt het
  alleen als terugval bij een dunne feitenbasis (`CONTENT_WEB_SEARCH`, uit als
  `WEB_SEARCH_ENABLED` uit staat) — zie `.env.example`.
- **Achtergrond-jobqueue, niet synchroon in de request**: elke pijplijnstap is een job
  in `jobs` die zichzelf naar de volgende stap doorschakelt (`lib/jobs/`). De werker
  (`/api/cron/worker`, aangestuurd via pg_cron) werkt de wachtrij af — geen browsertab
  hoeft open te blijven tijdens onderzoek/meting/rapport/content.
