# Supabase — schema & migraties

Dit mapje bevat het volledige datamodel van GEO Tracker als SQL-migraties, conform
[`abcplan.md`](../abcplan.md) §5 (datamodel) en §12.20 (RLS/schrijfstrategie).

| Bestand | Inhoud |
|---------|--------|
| `migrations/0001_init.sql` | Alle tabellen, enums, indexes en `updated_at`-triggers. |
| `migrations/0002_rls.sql` | Row Level Security: **SELECT-only** policies, `jobs` = deny-all. |

## Toepassen

### Optie A — Supabase CLI (aanbevolen)

```bash
# eenmalig: koppel je lokale repo aan je Supabase-project
supabase link --project-ref <jouw-project-ref>

# migraties naar de remote database pushen
supabase db push
```

### Optie B — SQL Editor (snelste voor een eerste keer)

Open **Supabase Dashboard → SQL Editor** en voer de bestanden in volgorde uit:
eerst `0001_init.sql`, daarna `0002_rls.sql`.

## Belangrijk over de schrijfstrategie

RLS staat **alleen lezen** toe. Alle schrijfacties (ook klant-CRUD zoals
prompt-beheer) lopen via de Next.js API-routes met de **service-role key** +
een expliciete ownership-check — nooit rechtstreeks vanuit de browser. Zie
`abcplan.md` §5/§12.20 voor de onderbouwing (RLS werkt op rij-, niet op
kolomniveau).

De `jobs`-tabel heeft **geen enkele** client-toegang: RLS aan, nul policies.
