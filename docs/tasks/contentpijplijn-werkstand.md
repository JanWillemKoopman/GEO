# Werkstand contentpijplijn publicatiewaardig

**Doel van dit bestand.** Een nieuwe sessie kan hiermee verder waar de vorige stopte. Het plan zelf,
met de diagnose, de keten, de werkpakketten en de toets, staat in
`docs/tasks/contentpijplijn-publicatiewaardig.md`; dat document is leidend en wordt hier niet
herhaald. Dit bestand houdt alleen bij waar de uitvoering staat, wat de eigenaar nog moet beslissen,
welke werkafspraken gelden en hoe je zuinig nameet. Bijgewerkt: 25 september 2026, na de nameting van
fase 1.

Weg zodra fase 3 af is, samen met het plan (§15 van het plan).

---

## 1. Waar we staan

| Onderdeel | Stand | Waar |
|---|---|---|
| Fase 1 (WP1 tot en met WP7) | Gebouwd, op productie, nagemeten. Doel niet gehaald | plan §13 "Stand van de bouw", §14.2 "Nameting fase 1" |
| Migraties | `0113` en `0114` op productie; volgende vrije nummer is `0115` (controleer met `ls supabase/migrations`) | `supabase/README.md` |
| Reparaties uit de nameting | PR 144 (F-nummer met feittekst) en PR 145 (redactie draait terug bij verdwenen kernfeit of leegschrappen; metatitel zonder halve naam) staan op productie | logboek, 25 september 2026 |
| Documentatie van de nameting | PR 146, alleen documentatie en meetbestanden; nog niet samengevoegd | `kwaliteitsdoorlichting/nameting-fase1/` |
| Stemvoorstel drie klanten (WP1) | Geschreven, wacht op akkoord van de eigenaar | `docs/tasks/schrijfstijl-voorstel-drie-klanten.md` |
| Fase 2 (WP8 tot en met WP10) | Niet begonnen. Pas na akkoord van de eigenaar | plan §13 "Fase 2" |

**De uitslag in één zin.** De indekzinnen en de consumentengids zijn weg en het kost $0,26 tot $0,31
per pagina, maar de pagina's zijn nu te dun: copywritercijfer 5 (Best) en 3 (kostenpagina), gelijk
aan de vorige versies, tegen een doel van 6,5.

## 2. Wat de eigenaar nog moet beslissen

1. **PR 146 samenvoegen** (alleen documentatie).
2. **Het stemvoorstel goedkeuren of aanpassen.** Tot dat akkoord er is, wordt er niets in het
   merkdossier op productie geschreven (letterlijke opdracht van de eigenaar).
3. **Eerst de dunne pagina's repareren, of meteen fase 2.** Het advies uit de nameting: eerst
   repareren, want fase 2 (stem en keuring) lost een dunne pagina niet op. Wat die reparatie zou zijn,
   staat in §4.

## 3. Werkafspraken van de eigenaar

Deze gelden naast `CLAUDE.md` en zijn in deze uitvoering expliciet gemaakt:

- **Fase voor fase.** Na elke fase stoppen, narekenen volgens plan §14.2 en rapporteren in gewone
  taal: wat er gebouwd is, welke zinnen uit §14.3 weg zijn, het cijfer van de blinde lezer tegen het
  doel van de fase, en de kosten per pagina. Een volgende fase pas na akkoord.
- **Zuinig met betaalde aanroepen.** Narekenen met twee pagina's, niet met alle drie de merken
  (besluit eigenaar bij de nameting van fase 1). Een ronde voor twee pagina's kost ongeveer $0,60.
- **Niet zelf samenvoegen zonder akkoord.** Een samenvoeging naar `main` gaat direct naar productie.
  De automatische controle in de sessie weigerde verder te werken na een samenvoeging zonder review;
  vraag daarom akkoord vóór elke samenvoeging, ook bij een kleine reparatie.
- **Merkdossier:** niets schrijven op productie zonder akkoord.
- **Wijkt de code af van een aanname in het plan,** zeg dat in één alinea en kies de oplossing die
  het dichtst bij het plan ligt.

## 4. Wat de nameting leerde, en wat de volgende stap zou zijn

De oorzaken, met het bewijs, staan in plan §14.2 onder "Wat niet werkt". Kort:

- De strategie zet elk onderwerp zonder bedrijfsfeit op "eerst vragen" of "weglaten". Daarmee
  verdwijnt ook de uitleg waar de lezer voor kwam ("wat zit er in de prijs").
- De schrijver vult het budget dan met herhaling.
- Sterk bewijs dat wel op de kaart staat, wordt niet als prioriteitsfeit gekozen (35 jaar, 4,9 uit 5,
  3D-ontwerp, offerte binnen 4 uur bij de hovenier).

Voorstel voor de reparatie, nog niet besproken met de eigenaar en nog niet gebouwd:

1. De strategie mag een kernvraag van de lezer beantwoorden met gecontroleerde algemene uitleg
   (bron `vakkennis`), zolang die niet als belofte van het bedrijf wordt gebracht. Alleen wat over
   het bedrijf zelf gaat, wordt een vraag aan de ondernemer.
2. Het sterkste bewijs op de kaart gaat verplicht mee als prioriteitsfeit, met een vangnet in code
   (conventie 1).
3. Het budget volgt de som van de onderwerpen; de code verhoogt het niet meer naar het vertrekpunt
   als de strategie zelf minder woorden plant (bij de kostenpagina werd 400 opgehoogd naar 600, en
   de schrijver schreef er 227).
4. De metabeschrijving krijgt hetzelfde vangnet als de metatitel (hij brak af op
   "Installatietechnh").
5. Het waarheidsdossier van de installateur aanvullen met wat op `/ketelvervanging` staat
   (CO-certificering, Intergas en Vaillant), anders telt de blinde lezer dat als verzonnen. De
   levertijd van twee tot vier weken hoort bij de hybride warmtepomp; het klantantwoord moet dat
   zeggen.

## 5. Zo meet je zuinig na

Er is lokaal geen OpenAI-sleutel; de keten draait op productie via de worker (`geo-worker`, elke
minuut). Je start een pagina door een taak in `jobs` te zetten met de Supabase MCP-tool
(`execute_sql`, project `kosauqzjbpweluiqgmwv`). Wacht met een achtergrond-`sleep`, niet met polling
in de voorgrond.

**De twee referentiepagina's.** Door de voorbereiding van een eerdere schrijftaak mee te geven, sla
je het dure onderzoek over en begint de keten bij de strategie:

```sql
insert into jobs (type, analysis_id, payload_json, dedupe_key)
select 'content_strategy', analysis_id,
  jsonb_strip_nulls(jsonb_build_object(
    'userId', payload_json->'userId',
    'recommendation', payload_json->'recommendation',
    'regenerate', true,
    'plannedPageId', payload_json->'plannedPageId',
    'voorbereid', payload_json->'voorbereid')),
  'content_strategy_nameting:<unieke-naam>:' || id
from jobs
where id in (
  '108470af-cb3d-4cd0-8070-15aa78d68673',  -- Best (hovenier), analyse 2d4ce398
  'c4148b42-e837-4928-8f13-cb3d2684f086'   -- kostenpagina (installateur), analyse 4795ebff
);
```

Elke keer een nieuwe `dedupe_key`, anders weigert de database de taak. De keten loopt daarna vanzelf:
`content_strategy` (ongeveer 100 seconden), `content_draft` (ongeveer 80), `content_edit` (in de
achtergrond, 3 tot 6 minuten), keuring en hoogstens twee reparatierondes. Reken op 10 tot 15 minuten.

**Wat je nakijkt.**
- Strategie: in `jobs.payload_json->'voorbereid'->'strategie'` van de `content_draft`-taak (bij
  `regenerate` staat hij niet op de vorige versie).
- Tekst en redactielog: `content_pieces` (de rij met `is_current`), kolommen `body_markdown`,
  `faq_json`, `meta_title`, `meta_description`, `edit_log_json`, `quality_json`.
- Kosten en duur: `ai_calls` sinds het starttijdstip, per `kind`. Let op: strategie en schrijven
  staan op de vorige versie, redactie en reparatie op de nieuwe, en de keuring op de analyse.

**De blinde lezer.** Zet de oude en nieuwe tekst in een JSON zoals
`kwaliteitsdoorlichting/nameting-fase1/teksten.json` en draai
`python3 scripts/doorlichting/nameting-opdracht.py <bestand>`. Dat maakt per pagina een losse
opdracht (dezelfde vragenlijst als poort19) en een vergelijking tussen oud en nieuw. Laat elke
opdracht door een eigen, afgeschermde subagent uitvoeren, met de opdracht alleen dat bestand te lezen.
Let op: het script schrijft naar `nameting-fase1/`; pas `UIT` aan voor een nieuwe meting. Een los
cijfer van de lezer schommelt; de vergelijking tussen oud en nieuw is betrouwbaarder
(`kwaliteitsdoorlichting/blinde-lezer-toets/README.md`).

**Vaste gegevens.**

| Merk | Profiel |
|---|---|
| Hans Verstraaten Hoveniers | `f14e89ab-6db2-41ea-8bbc-0827d6025470` |
| Wesley Keeris Installatietechniek | `ca8313fb-3c2e-4b37-9985-0f8be8dc6e8b` |
| Autorijschool Pompert | `467f8307-74dd-4e84-b443-40cc1ce88f9e` |

Het feitenregister draai je per merk met een taak `fact_register`, payload `{}`, `profile_id`
ingevuld en `dedupe_key` `fact_register:<profiel>`. Kosten voor alle drie samen: ongeveer $0,016.

## 6. Valkuilen die in deze uitvoering zijn tegengekomen

- De chaintest gebruikt een stub die precies geeft wat de code verwacht. Een model dat het anders
  opschrijft ("F15: Het bedrijf werkt in Best." in plaats van "F15"), zie je pas op productie. Neem
  bij elke nieuwe modeluitvoer ook de slordige vorm op in `test-unit.ts`.
- Een vangnet dat alleen meldt en niet terugdraait, werkt niet: de reparatie herstelt het maar half.
- De lokale `main` kan achterlopen; begin met `git fetch origin main` en een branch vanaf
  `origin/main`.
- De vier controles vóór elke commit: `npx tsc --noEmit`, `npm run test:unit`, `npm run test:chain`,
  `npm run build`.

## 7. Startprompt voor een nieuwe sessie

```
We gaan verder met de uitvoering van docs/tasks/contentpijplijn-publicatiewaardig.md.
Lees eerst CLAUDE.md, daarna docs/tasks/contentpijplijn-werkstand.md (waar we staan, wat
open staat, de werkafspraken en hoe je zuinig nameet), en daarna in het plan §13 "Stand van
de bouw" en §14.2 "Nameting fase 1". Lees de code die daar genoemd wordt voordat je iets
voorstelt.

Houd je aan de werkafspraken in §3 van de werkstand: fase voor fase, zuinig met betaalde
aanroepen (twee pagina's per nameting), niets samenvoegen naar main en niets in het
merkdossier op productie schrijven zonder mijn akkoord.

Opdracht voor deze sessie: [vul in, bijvoorbeeld "bouw de reparatie van de dunne pagina's
uit §4 van de werkstand, meet na met de twee referentiepagina's en rapporteer" of "begin aan
fase 2"].

Werk de werkstand bij aan het eind van de sessie, in dezelfde commit als de rest.
```
