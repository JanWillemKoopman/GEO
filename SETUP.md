# SETUP — GEO Tracker (developer-handleiding)

De inhoudelijke visie staat in [`README.md`](./README.md), het technische plan in
[`abcplan.md`](./abcplan.md) en de vormgeving in [`designsystem.md`](./designsystem.md).
Dit bestand beschrijft hoe je de app lokaal draait en deployt.

> **Status:** Sprint 1 (fundament) is opgeleverd. De feature-schermen en de
> pipeline (Sprint 2–7) volgen. Zie [`abcplan.md`](./abcplan.md) §11 voor de
> volledige bouwvolgorde.

## Wat er nu staat

```
app/                     Next.js App Router
  layout.tsx             fonts (Geist + JetBrains Mono) + dark-mode shell
  page.tsx               scaffold-statuspagina (env-check + design system)
  globals.css            design system uit designsystem.md §C
  api/health/route.ts    health-check (booleans, geen secrets)
lib/
  env.ts                 gevalideerde env-toegang + modelkeuze
  supabase/              client (browser) · server (sessie) · admin (service-role)
  openai/                client + structured-output helper (Responses API + web_search)
  schemas/               alle Zod-contracten (Brand DNA, prompts, mention, gap, report, content)
  types/database.ts      TypeScript-datamodel
supabase/migrations/     0001_init.sql (schema) · 0002_rls.sql (RLS)
scripts/test-openai.ts   rooktest: beide modellen + structured output + web_search
```

## 1. Vereisten

- **Node.js ≥ 20**
- Een **Supabase**-project (gratis tier volstaat om te bouwen)
- Een **OpenAI**-API-key met toegang tot `gpt-4.1-nano` en `gpt-4.1-mini`
- Optioneel: een **Resend**-key (pas nodig in Sprint 5 voor de rapport-mail)

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
| `RESEND_API_KEY` | resend.com (optioneel — zonder key wordt de rapport-mail stil overgeslagen, zie §7b) |

De OpenAI-modelkeuze (`gpt-4.1-nano` / `gpt-4.1-mini`) staat **vast in de code**
(`lib/openai/models.ts`), niet als env-variabele — zie `abcplan.md` §2.

## 4. Database opzetten

Pas de migraties toe op je Supabase-project (zie [`supabase/README.md`](./supabase/README.md)):

```bash
supabase link --project-ref <jouw-project-ref>
supabase db push
```

of plak `supabase/migrations/0001_init.sql` en daarna `0002_rls.sql` in de SQL Editor.

### Migraties 0012 t/m 0022 — met de hand toepassen

De migraties uit het optimalisatietraject staan ook als samengevoegde bestanden klaar, zodat
je ze zonder de Supabase-CLI in de SQL Editor kunt plakken. **De volgorde is niet vrij** —
elk bestand bouwt voort op het vorige:

| Volgorde | Bestand | Wat het toevoegt |
|---|---|---|
| 1 | `RUN_0012_TOT_0017.sql` | Kostenlogboek, wachtrij, e-mailkeuze, meetkwaliteit, volumebanden |
| 2 | `RUN_0018_EN_0019.sql` | Technische GEO-audit; doelvragen, versies, GEO-score, feitenvragen |
| 3 | `RUN_0020.sql` | Publicatiestatus, hermetingen, gemeten effect |
| 4 | `RUN_0021.sql` | Rapport per periode, verandering, mailstatus |
| 5 | `RUN_0022.sql` | Bronnenlandschap, off-site taken, entiteitsaanwezigheid |

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

1. Push naar GitHub (branch `claude/geo-app-development-ho02tg`).
2. Importeer de repo in Vercel — Next.js wordt automatisch herkend.
3. Zet dezelfde env-variabelen in **Project → Settings → Environment Variables**
   (let op: `SUPABASE_SERVICE_ROLE_KEY` is server-only, geen `NEXT_PUBLIC_`).
4. Deploy. Check `/api/health` om te bevestigen dat alles geconfigureerd is.

## 6b. Cron-taken activeren

Er zijn er twee, allebei beveiligd met `CRON_SECRET`:

| Taak | Pad | Schema | Waarvoor |
|---|---|---|---|
| **Werker** | `/api/cron/worker` | elke minuut | Werkt de wachtrij af: onderzoek, meting, rapport, content. **Zonder deze taak gebeurt er niets.** |
| Terugkerende meting | `/api/cron/tracking` | maandelijks, de 1e om 06:00 UTC | Plant een nieuwe meting in voor analyses met de tracking-schakelaar aan. |

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

> ⚠️ **De werker draait elke minuut en dat vraagt een betaald Vercel-plan.**
> Alternatief zonder extra abonnement: migratie `0015_worker_cron_via_pg_cron.sql`
> laat Supabase de werker aansturen via `pg_cron` + `pg_net`. Zet daarvoor eerst
> de twee Vault-geheimen (staat in de migratie beschreven). Beide tegelijk mag
> ook — twee werkers pakken elkaars werk niet dubbel op.

## 7b. Rapport-e-mail activeren (Sprint 5, optioneel)

Na de nulmeting stelt de app automatisch een rapport op (halte B1+B2) en
probeert dat naar de accounthouder te mailen via Resend. Zonder `RESEND_API_KEY`
wordt deze stap **stil overgeslagen** (gelogd, niet blokkerend) — het rapport
blijft gewoon zichtbaar in de app op het tabblad Rapport.

1. Maak een gratis account op [resend.com](https://resend.com) en een API-key.
2. Zet `RESEND_API_KEY` in Vercel. `RESEND_FROM_EMAIL` mag je laten staan op
   het Resend-testadres (`onboarding@resend.dev`) totdat je een eigen domein
   verifieert bij Resend.
3. Redeploy.

## Architectuurprincipes (kort, uit `abcplan.md`)

- **Schrijven altijd via API-routes** met de service-role key + ownership-check.
  Nooit rechtstreeks vanuit de browser naar Postgres (§5/§12.20).
- **RLS = SELECT-only**; `jobs` heeft geen client-toegang.
- **We bewaren alles**: elke AI-call slaat zijn volledige ruwe JSON op naast de
  uitgesplitste kolommen (§5).
- **web_search alleen waar nodig** (Brand DNA + meting), nooit bij prompt-/rapport-/
  content-generatie (§10 kostenknop).
