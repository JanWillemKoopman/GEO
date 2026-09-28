-- 0125: afhankelijkheden (G2 van docs/tasks/van-pijplijn-naar-kennissysteem.md, §6.5)
--
-- Waarom. "Deze kans of pagina leunt op dit kennisitem": vandaag staat dat
-- verspreid (`kansen.geldt_voor`, `content_pieces.gebruikte_kennis`, beide
-- uuid-arrays zonder eigen tabel). Eén tabel maakt de vraag "wat hangt er aan
-- deze dienst" (G2 klaar-als) één query, en is waar G3 straks leest wat er
-- geraakt wordt als een kennisitem verandert.
--
-- Gevuld door wie het object maakt, niet achteraf geraden (§6.5): N2 en N5 bij
-- het vastleggen van een kans, C3 bij het schrijven en herschrijven van een
-- pagina. Nog niet gevuld door de meetvragen (`prompts`): die dragen vandaag
-- geen verwijzing naar een dienst of regio in de kennislaag, dus dat deel is
-- bewust nog open (zie de toelichting bij G2 in §13 van dat plan) in plaats van
-- geraden.
--
-- Interne infrastructuur zoals `jobs` en `gebeurtenissen`: RLS aan, geen
-- policies. Additief en idempotent (conventie 4).

create table if not exists public.afhankelijkheden (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  -- Welk object leunt op de kennis: 'kansen' of 'content_pieces' vandaag, meer
  -- soorten kunnen erbij (de check-constraint is te verruimen, zoals 0116 en
  -- 0123 dat al eens deden).
  van_tabel      text not null,
  van_id         uuid not null,
  kennis_id      uuid not null references public.klantkennis (id) on delete cascade,
  aangemaakt_op  timestamptz not null default now()
);

do $$ begin
  alter table public.afhankelijkheden add constraint afhankelijkheden_van_tabel_check check (
    van_tabel in ('kansen', 'content_pieces'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.afhankelijkheden
    add constraint afhankelijkheden_uniek unique (van_tabel, van_id, kennis_id);
exception when duplicate_object then null; end $$;

-- Het meest gestelde: "wat hangt er aan dit kennisitem" (G2 klaar-als).
create index if not exists afhankelijkheden_kennis_idx
  on public.afhankelijkheden (kennis_id);

create index if not exists afhankelijkheden_van_idx
  on public.afhankelijkheden (van_tabel, van_id);

alter table public.afhankelijkheden enable row level security;

comment on table public.afhankelijkheden is
  'Welke kans of pagina leunt op welk kennisitem (G2). Geen client-toegang; '
  'gevuld door wie het object maakt (lib/kansen/, lib/pagina/taken.ts).';
