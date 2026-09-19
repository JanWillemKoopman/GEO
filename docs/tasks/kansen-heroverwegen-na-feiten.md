# Afgewezen kansen heroverwegen zodra er feiten binnenkomen

**Voorstel van 19 september 2026. Niet gebouwd.** Afgesplitst van
`docs/tasks/contenttype-bij-cluster.md`, waar het als stap 4 en 5 stond. Het hoorde daar niet thuis:
dat document gaat over gerichter schrijven op basis van contenttype, en dit lost iets anders op.

## Het gat

Het rapportmodel wijst kansen af en schrijft op waarom (`reports.declined_json`, migratie 0078).
Nagerekend op productie op 19 september 2026 over 18 opgeschreven afwijzingen:

| reden | aantal |
|---|---|
| er is geen feit over het bedrijf om dit waar te maken | 11 |
| overlapt met een andere aanbeveling | 5 |
| overig | 2 |

Elf van de achttien wachten dus op een antwoord van de ondernemer, en daar is een mechanisme voor:
`fact_requests`. Op productie staan er **88 beantwoorde feitenvragen**, 25 open en 4 overgeslagen.

Geen van die 88 antwoorden heeft ooit een afgewezen kans opnieuw laten beoordelen. Dat kan ook niet:
`reports` heeft een unieke index op `(analysis_id, week_no)` en `generateReport()` breekt af als het
rapport er al is (zie `contenttype-bij-cluster.md` §7.1). De klant wacht dus tot de volgende
meetperiode op werk waarvan het bewijs er allang ligt.

⚠️ Preciezer dan "de antwoorden doen niets": een beantwoord feit telt wél mee voor elke pagina die
nog geschreven moet worden, want de feitenkaart wordt bij het schrijven opgebouwd. Wat niet gebeurt,
is dat een afgewezen kans alsnog een kans wordt.

## Wat het zou worden

Een knop "Beoordeel de afgewezen kansen opnieuw", op het kansenscherm, voor de consultant.

- **Aanleiding:** er zijn feitenvragen beantwoord sinds het laatste rapport van dit cluster. Nul
  nieuwe antwoorden betekent geen aanroep en een melding die zegt waarom.
- **Vorm:** het sjabloon van `lib/pipeline/propose-more-topics.ts`. Eerst een voorbeeld met de
  geschatte kosten, dan pas de aanroep. Altijd aanvullend, nooit vervangend. Eigen jobtype
  (conventie 7). Nul is een geldige uitkomst en wordt vastgelegd.
- **Eisen:** dezelfde vier als het rapport, plus geen overlap met een kans die al in de voorraad
  staat, getoetst op de zwaarste doelvraag zoals `mergeOverlappingRecommendations()` dat al doet.
- **Rechten:** in `lib/cost-rules.ts`, bij `STAFF_ONLY_ACTIONS`, met een melding die de klant
  uitnodigt in plaats van afwijst.

## Wat er eerst moet: een tweede bron naast het rapport

Dit is het echte werk en het geldt voor élke tweede kansenbron, welke aanleiding hij ook krijgt.

- **Een eigen tabel,** bijvoorbeeld `opportunity_rounds`, met `recommendations_json` in dezelfde vorm
  als bij `reports`. Zonder die opslag kan een rondekans maanden later zijn doelvragen niet meer
  teruggeven.
- **`targetsFromSourceRef()` moet vertakken.** Die functie (`lib/plan-backlog-data.ts:378`) splitst de
  sleutel op `#` en zoekt deel 1 op in `reports`. Een sleutel `ronde:<ronde-id>#<nr>` levert daar
  niets op, en de functie geeft dan stil een lege lijst terug. Gevolg: nul rijen in
  `content_piece_targets` en `planImpactWaves()` slaat de effectmeting over. Precies dezelfde stille
  fout als het verloren contenttype dat migratie 0107 repareerde.
- **`syncBacklog()` moet beide bronnen lezen,** en `planned_pages.source` een vierde waarde krijgen
  (`ronde`), met hetzelfde `drop constraint if exists` plus `add constraint`-patroon dat migratie
  0065 zelf gebruikt. `app/api/cron/plan/route.ts` beslist op `source === "aanbeveling"` en moet die
  nieuwe waarde ook accepteren.

## Het risico dat blijft

`syncBacklog()` verwijdert nooit iets, en kansen uit een tweede ronde zijn per definitie lichter dan
die uit het rapport. Ze komen in dezelfde voorraad en concurreren via de potentiescore om dezelfde
plekken in een plan met een vast aantal pagina's per maand. Een knop die ruimte lijkt te maken, kan
dus het zwaardere werk verdringen. Daarom krijgt de herkomst een eigen waarde in `source`: alleen zo
zijn rondekansen te filteren en is hun effect apart te meten tegen dat van rapportkansen. Dat is de
meting die moet uitwijzen of de knop waarde toevoegde.

## Waarom dit wacht

Het is geen kleine ingreep (een tabel, een jobtype, een AI-aanroep, rechten) en het lost een ander
probleem op dan waar de vraag mee begon. Het verdient een eigen beslissing, met de 88 beantwoorde
feitenvragen als aanleiding en niet als bijvangst van een contenttypeknop.
