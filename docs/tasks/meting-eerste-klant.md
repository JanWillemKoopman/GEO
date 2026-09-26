# Meting bij de eerste echte klant

Na WP9 ronde 2 (26 september 2026) adviseerde de onafhankelijke copywriter om geen derde
vergelijkingsronde met AI-teksten te doen, maar bij de eerste echte klant te meten wat de ondernemer
zelf verandert. Dit document zegt wat we meten, waar het vandaan komt en wat een mens doet. Het hoort
bij WP10 van `contentketen-opnieuw.md`; als de meting gedaan is, gaat de uitslag naar §12 daarvan en
naar `docs/logbook.md`, en verdwijnt dit bestand.

## Wat we meten

| # | Vraag | Hoe | Door |
|---|---|---|---|
| 1 | Welke zinnen verandert de ondernemer? | De zinnen van het model tegen de goedgekeurde tekst | Code |
| 2 | Welke beweringen herkent de ondernemer niet? | Gele zinnen die niet bevestigd zijn en niet meer in de tekst staan, plus de geschrapte zinnen uit punt 1 | Code, daarna een mens |
| 3 | Klinkt de tekst als het eigen bedrijf? | Per pagina vragen: ja, grotendeels of nee | Mens, in het gesprek |
| 4 | Hoeveel inhoudelijke wijzigingen zijn nodig? | Aantal geschrapte en nieuwe zinnen, plus het aantal gevraagde aanpassingen | Code |
| 5 | Vooral feiten, of ook stijl en opbouw? | Het rapport doorlezen en per wijziging kiezen | Mens |
| 6 | Welke vragen voegden achteraf echt iets toe? | Per vraag het aandeel van het antwoord dat de schrijver gebruikte, en of die zinnen bleven staan | Code, daarna een mens |

Punt 3 en 5 blijven bewust mensenwerk: een model dat zijn eigen tekst beoordeelt, meet niet wat de
ondernemer vindt, en een extra beoordelaar mag er niet bij (B15).

## Waar de gegevens staan

- De tekst van het model: `content_pieces.raw_json.uitvoer.tekst_markdown`. Een handmatige wijziging
  overschrijft `body_markdown`, niet dit veld.
- De goedgekeurde tekst: `body_markdown`, met `reviewed_at` gevuld en `needs_review` onwaar.
- De gele zinnen en wat bevestigd is: `controle_json.gele_zinnen` en `controle_json.bevestigd`.
- Een gevraagde aanpassing: een nieuwe versie met `supersedes_id`, de wens in `revision_note`.
- De vragen en antwoorden: `fact_requests` met het id van de pagina in `content_piece_ids`.

## Zo maak je het rapport

1. Draai deze query in Supabase, met het id van het merkprofiel, en bewaar de uitkomst als
   `export.json`:

```sql
select json_build_object(
  'titel', c.title,
  'machinetekst', c.raw_json->'uitvoer'->>'tekst_markdown',
  'definitief', c.body_markdown,
  'bewerktDoorKlant', c.edited_by_user,
  'goedgekeurd', (c.reviewed_at is not null and not c.needs_review),
  'aanpassingen', coalesce((select json_agg(v.revision_note order by v.version) from content_pieces v
    where v.analysis_id = c.analysis_id and v.title = c.title and v.revision_note is not null), '[]'::json),
  'geel', coalesce(c.controle_json->'gele_zinnen', '[]'::jsonb),
  'bevestigd', coalesce(c.controle_json->'bevestigd', '[]'::jsonb),
  'vragen', coalesce((select json_agg(json_build_object('vraag', f.question, 'status', f.status, 'antwoord', f.answer)
    order by f.created_at) from fact_requests f
    where f.content_piece_ids @> array[c.id] and not coalesce(f.open_vraag, false)), '[]'::json)
) as pagina
from content_pieces c join analyses a on a.id = c.analysis_id
where a.profile_id = '<profiel-id>' and c.is_current and c.status <> 'archived'
order by c.created_at;
```

2. `npx tsx scripts/klantmeting.ts export.json > rapport.md`
3. Vul per pagina de twee vragen onderaan in (punt 3 en 5), en markeer bij punt 6 welke vragen de
   ondernemer zelf de moeite waard vond.

Getoetst op 26 september 2026 tegen de proefrijschool op productie: de query geeft per pagina één rij
met alle velden. Die proefpagina's zijn niet door een ondernemer bewerkt; het verschil zelf is dus
alleen met de eenheidstests getoetst.

## Wat de cijfers wel en niet zeggen

- Het verschil telt zinnen, niet woorden: één ander getal is één veranderde zin. Hoofdletters en
  leestekens tellen niet mee, zodat de meeste reparaties door de keten zelf geen wijziging lijken. Een
  reparatie die woorden verandert (een verboden teken dat een nieuwe zin wordt), telt wel mee.
- Het gebruik van een antwoord is een signaal, geen bewijs: het telt welke getallen en woorden van
  zeven letters of meer uit het antwoord in de tekst van het model staan.
- Een aanpassing van vóór 26 september 2026 heeft geen `revision_note`; de wens staat dan alleen in
  `jobs.payload_json.klantNotitie`.
