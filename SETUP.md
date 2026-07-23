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
| `RESEND_API_KEY` | resend.com (optioneel, later) |

De modelnamen (`OPENAI_MODEL_VOLUME`/`QUALITY`) staan al goed ingevuld conform
`abcplan.md` §2 — laat ze staan tenzij je bewust wijzigt.

## 4. Database opzetten

Pas de migraties toe op je Supabase-project (zie [`supabase/README.md`](./supabase/README.md)):

```bash
supabase link --project-ref <jouw-project-ref>
supabase db push
```

of plak `supabase/migrations/0001_init.sql` en daarna `0002_rls.sql` in de SQL Editor.

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

## 6. Deployen naar Vercel

1. Push naar GitHub (branch `claude/geo-app-development-ho02tg`).
2. Importeer de repo in Vercel — Next.js wordt automatisch herkend.
3. Zet dezelfde env-variabelen in **Project → Settings → Environment Variables**
   (let op: `SUPABASE_SERVICE_ROLE_KEY` is server-only, geen `NEXT_PUBLIC_`).
4. Deploy. Check `/api/health` om te bevestigen dat alles geconfigureerd is.

> De cron voor de wekelijkse tracking-lus (`abcplan.md` §6 A3) wordt in Sprint 4
> toegevoegd via `vercel.json` + een beschermd `/api/cron/*`-endpoint.

## Architectuurprincipes (kort, uit `abcplan.md`)

- **Schrijven altijd via API-routes** met de service-role key + ownership-check.
  Nooit rechtstreeks vanuit de browser naar Postgres (§5/§12.20).
- **RLS = SELECT-only**; `jobs` heeft geen client-toegang.
- **We bewaren alles**: elke AI-call slaat zijn volledige ruwe JSON op naast de
  uitgesplitste kolommen (§5).
- **web_search alleen waar nodig** (Brand DNA + meting), nooit bij prompt-/rapport-/
  content-generatie (§10 kostenknop).
