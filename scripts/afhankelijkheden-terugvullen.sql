-- Eenmalige, idempotente backfill van `afhankelijkheden` (G2 van
-- docs/tasks/van-pijplijn-naar-kennissysteem.md) uit wat er al stond vóór
-- migratie 0125: `kansen.geldt_voor` en `content_pieces.gebruikte_kennis`.
--
-- Draait via de databaseverbinding van de beheertool (besluit V15), niet via
-- lib/kennis/: dit voegt geen nieuwe kennis toe en beslist niets, het leest
-- alleen twee bestaande arrays over in de nieuwe tabel. Een tweede run vindt
-- niets nieuws (`on conflict do nothing` op de unieke index van 0125).
--
-- Uitgevoerd op productie op 27 september 2026 (via de Supabase MCP-tool):
-- 65 rijen uit `kansen.geldt_voor`, 0 uit `content_pieces.gebruikte_kennis`
-- (er is nog geen pagina geschreven ná migratie 0124).

insert into public.afhankelijkheden (profile_id, van_tabel, van_id, kennis_id)
select k.profile_id, 'kansen', k.id, g.kennis_id
from public.kansen k, unnest(k.geldt_voor) as g(kennis_id)
where array_length(k.geldt_voor, 1) > 0
on conflict (van_tabel, van_id, kennis_id) do nothing;

insert into public.afhankelijkheden (profile_id, van_tabel, van_id, kennis_id)
select a.profile_id, 'content_pieces', cp.id, g.kennis_id
from public.content_pieces cp
join public.analyses a on a.id = cp.analysis_id
, unnest(cp.gebruikte_kennis) as g(kennis_id)
where array_length(cp.gebruikte_kennis, 1) > 0
on conflict (van_tabel, van_id, kennis_id) do nothing;
