-- ═══════════════════════════════════════════════════════════════════════════
-- 0035 — Merkdocumenten: bewaren wat de klant aanleverde (S5)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- Het merkdossier (S5) laat de klant plakken wat hij al heeft liggen — een
-- tarievenpagina, een brochure, zijn veelgestelde vragen — en haalt daar
-- controleerbare feiten uit. De eerste versie bewaarde dat materiaal NIET: na de
-- extractie was de brontekst weg.
--
-- Dat kost drie dingen:
--
--   1. Opnieuw uitlezen kan niet. Wordt de extractieprompt beter, dan profiteren
--      alleen nieuwe documenten daarvan.
--   2. Herkomst tonen kan niet. "Dit kwam uit je tarievenpagina van 14 juli" is
--      precies het soort verantwoording dat dit product verkoopt.
--   3. Dubbel plakken wordt niet gemerkt. Dezelfde brochure twee keer levert
--      twee keer dezelfde feiten op, en die vechten daarna om dezelfde plek op
--      de feitenkaart.
--
-- WAAROM DEZE OPLOSSING
--
-- Een eigen tabel en niet een kolom op `profiles`: een klant levert meerdere
-- documenten aan, op verschillende momenten, en elk document heeft z'n eigen
-- uitkomst (hoeveel feiten eruit kwamen, hoeveel er door het vangnet vielen).
-- Dat laatste is geen boekhouding maar een signaal: blijft de afkeurratio hoog,
-- dan is de instructie niet streng genoeg — hetzelfde patroon als
-- `reports.stripped_claims_json` onder het rapport (R1.3).
--
-- `content_hash` in plaats van de tekst vergelijken: een klant die dezelfde
-- pagina opnieuw plakt krijgt exact dezelfde hash, ook bij 12.000 tekens.

create table if not exists public.brand_documents (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  -- Hoe de klant het herkent: "Tarieven 2026", "Brochure private lease".
  label            text,
  -- De letterlijke aangeleverde tekst. Dit is de bron waartegen elk feit uit dit
  -- document is nagetrokken; hem weggooien maakt die controle onherhaalbaar.
  body             text not null,
  content_hash     text not null,
  chars            integer not null,
  -- Wat de extractie opleverde. `rejected` is het aantal voorstellen dat NIET
  -- letterlijk in `body` stond en dus is weggegooid (dossier-verify.ts).
  facts_extracted  integer not null default 0,
  facts_rejected   integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists brand_documents_profile_idx
  on public.brand_documents (profile_id, created_at desc);

-- Hetzelfde document twee keer plakken levert één rij op. Partieel noch
-- ingewikkeld: één klant, één inhoud, één document.
create unique index if not exists brand_documents_uniek_idx
  on public.brand_documents (profile_id, content_hash);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Zelfde patroon als alle andere tabellen (abcplan.md §5): lezen mag de
-- eigenaar, schrijven gaat uitsluitend via een route met de service-role en een
-- expliciete eigenaarschapscontrole.
alter table public.brand_documents enable row level security;

drop policy if exists "brand_documents_select_own" on public.brand_documents;
create policy "brand_documents_select_own"
  on public.brand_documents for select
  using (exists (
    select 1 from public.profiles p
    where p.id = brand_documents.profile_id and p.user_id = (select auth.uid())
  ));

-- ── Controle ────────────────────────────────────────────────────────────────
select count(*) as documenten from public.brand_documents;
