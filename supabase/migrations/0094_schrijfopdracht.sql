-- 0094: de SCHRIJFOPDRACHT van een pagina
-- (optimalisatie 5 en 6 uit docs/tasks/optimalisaties-expertronde-4-september-2026.md)
--
-- ── WAAROM DEZE KOLOM ─────────────────────────────────────────────────────────
--
-- Twee externe experts kwamen op 4 september 2026 op dezelfde conclusie uit: de
-- pijplijn is goed in het voorkomen van slechte tekst en nog niet goed in het
-- veroorzaken van uitstekende tekst. De schrijver krijgt achttien blokken
-- informatie die allemaal dezelfde status hebben, en niets in de keten kiest
-- welke zes daarvan er voor DEZE pagina toe doen. Een copywriter doet precies
-- dat als eerste.
--
-- De schrijfopdracht is die keuze, gemaakt vóór de dure schrijfaanroep en
-- bewaard naast de pagina. Hij voegt geen informatie toe: hij prioriteert wat er
-- al is. De feitenkaart blijft compleet, de opdracht zegt welke F-nummers deze
-- pagina dragen.
--
-- Het veld dat er in geen enkele bestaande stap zat is `keuzeredenen`: waarom
-- zou juist DEZE lezer DIT bedrijf kiezen. Dat is de vraag waarmee de externe
-- copywriter op 3 september zijn hele beoordeling samenvatte ("de teksten weten
-- wat het bedrijf doet en wat de lezer wil weten, maar nog onvoldoende waarom
-- deze lezer dit bedrijf zou moeten kiezen"), en overtuigingskracht was met 2,6
-- van 5 zijn laagste cijfer.
--
-- ── VORM ──────────────────────────────────────────────────────────────────────
--
-- {
--   "lezer": "iemand met water door zijn plafond die vandaag hulp zoekt",
--   "hoofdvraag": "kan er vandaag iemand komen en wat kost dat",
--   "kernantwoord": "wij zijn er binnen 24 uur en u hoort het bedrag vooraf",
--   "waaromDezePagina": "de assistent noemt bij deze vraag alleen andere partijen",
--   "kernfeiten": ["F2", "F3", "F7"],
--   "keuzeredenen": [{ "factRef": "F2", "reden": "deze lezer heeft haast" }],
--   "eigenWoorden": "wij werken niet over houtrot heen, want dan ...",
--   "moetErIn": ["het bedrag vooraf"],
--   "nietDoen": ["geen checklist om dakdekkers te vergelijken"],
--   "blijftHangen": "dit bedrijf begrijpt mijn situatie en komt vandaag"
-- }
--
-- Additief en idempotent (conventie 4): default een leeg object, geen bestaande
-- rij verandert van betekenis, en een pagina van vóór deze migratie wordt
-- precies zo geschreven en beoordeeld als voorheen (conventie 3).

alter table public.content_pieces
  add column if not exists writer_brief_json jsonb not null default '{}'::jsonb;

comment on column public.content_pieces.writer_brief_json is
  'De schrijfopdracht: de redactionele keuze vóór het schrijven. Wie de lezer is, wat hij moet '
  'begrijpen, welke F-nummers deze pagina dragen, en waarom juist deze lezer dit bedrijf zou '
  'kiezen. Leeg object = geen opdracht, en dan verandert er niets aan het oordeel.';
