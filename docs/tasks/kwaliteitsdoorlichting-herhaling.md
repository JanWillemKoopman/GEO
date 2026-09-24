# Kwaliteitsdoorlichting: overdracht en de herhaling

> **Wat dit is.** Het startpunt voor een nieuwe werksessie die de kwaliteitsdoorlichting afmaakt. Hier
> staat waar we staan, wat er nog open is, hoe je een nieuwe werkomgeving klaarzet, en de herhaling
> stap voor stap. De bevindingen zelf staan in `docs/tasks/bevindingen-kwaliteitsdoorlichting.md`, de
> cijfers per stap van de eerste doorloop in `docs/tasks/kwaliteitsdoorlichting-stappen.md`, het plan
> en de opzet van de meetlat in `docs/tasks/kwaliteitsdoorlichting-pijplijn.md`. Hier wordt daar alleen
> naar verwezen. Verwijder dit document zodra de herhaling gedaan en vastgelegd is.

---

## 1. Waar we staan (24 september 2026)

Drie echte bedrijven uit de regio Eindhoven zijn op 23 en 24 september door de hele keten gegaan,
van merk aanmaken tot 16 geschreven pagina's. Daaruit kwamen 54 bevindingen. In de verbeterronde van
24 september zijn ze opgelost in zes blokken, live in PR #121 tot en met #127, met de stand in PR #128.
De besluiten van de eigenaar en de tabel per blok staan bovenaan de bevindingenlijst.

**De nulmeting**, na te rekenen met `scripts/doorlichting/tel-oordeel.py`:

| Maat | Nulmeting |
|---|---|
| Gemiddeld copywritercijfer van de blinde lezers | **4,1 op 10** (16 teksten) |
| Ondernemer publiceert: zo / met aanpassingen / nee | 0 / 11 / 5 |
| Bezoeker neemt contact op: ja / misschien / nee | 3 / 12 / 1 |
| Nieuwe tekst beter dan de huidige pagina | 11 van 15 vergelijkingen |
| Past niet bij het adres | 5 van 16 |
| Niveau professionele copywriter | bij geen van de drie merken |

**Wat nog open is:**

| Punt | Waarom nog open | Wat de herhaling moet laten zien |
|---|---|---|
| Afsluiting van het plan | nog niet gedaan | dezelfde drie merken opnieuw door de keten, dezelfde blinde lezers, vergeleken met de tabel hierboven |
| 45, functie van de pagina | geen nieuwe tekst sinds de reparatie | "past niet bij het adres" van 5 naar 0; homepage, contact en over-ons worden nooit vervangen |
| 47, sterkste bewijs | idem | minstens één gespreksfeit in elke tekst (93 procent, 1.800 contracten, twaalf monteurs, vaste ploeg van vijf) |
| 50, de reparatieknop | oorzaak weg via 39, niet opnieuw geprobeerd | "los alles op" haalt geen juist klantfeit meer weg |
| 17, Gemini-limiet | spreiding gebouwd, nog geen meting sindsdien | geen uitgevallen Gemini-meting bij drie merken tegelijk |
| Ideale klant, 2 van 6 | vermoeden dat de opzet van de pagina vóór de opmerking gemaakt is, niet nagerekend | zie de wisselproef onderaan `kwaliteitsdoorlichting-stappen.md` |
| 15 en 16 | eenmalig, niet herhaald | alleen oppakken als ze terugkomen |

⚠️ **Nog een keuze van de eigenaar.** De herhaling kost geld (§4, stap 0). De eigenaar is om akkoord
gevraagd en heeft nog niet geantwoord. Start geen betaalde stap zonder dat akkoord.

---

## 2. Wat er in de repository staat

| Plek | Wat |
|---|---|
| `docs/tasks/kwaliteitsdoorlichting/` | De proefset: waarheidsdossiers, gesprekken, antwoorden, sitekopieën, de teksten en oordelen van de nulmeting. Zie de `README.md` daar |
| `scripts/doorlichting/ui.mjs` | Schermbesturing met Playwright: `node ui.mjs <consultant\|klant> stappen/<stap>.mjs [args]`. Logt in, voert de stap uit, maakt schermafdrukken |
| `scripts/doorlichting/stappen/` | De stappen, elk met zijn gebruik in de eerste regel: merk aanmaken, gesprek, cluster starten, toewijzen, pakket, vragen, antwoorden, plan opstellen en opnieuw opzetten, vrijgeven, herschrijven, "los alles op", tekst en spoor ophalen |
| `scripts/doorlichting/maak-poort-*.py` | Bouwen de opdracht voor de blinde lezer: over het onderzoek, het rapport of de teksten. Draaien vanuit `docs/tasks/kwaliteitsdoorlichting/` |
| `scripts/doorlichting/tel-oordeel.py` | Telt de oordelen over de teksten op; zonder argument de nulmeting |
| `scripts/doorlichting/wacht-taken.mjs`, `wacht-onderzoek.sh` | Wachten tot de taken van de drie merken klaar zijn |
| `scripts/doorlichting/haal-site.py` | Maakt een eigen kopie van de sitetekst |
| `scripts/live.ts` (`npm run live`) | De API van productie aanroepen als ingelogde gebruiker |

Controle: `maak-poort-teksten.py` geeft voor merk A precies dezelfde opdracht als die van de
nulmeting, en `tel-oordeel.py` rekent 4,1 en 11 van 15 terug.

---

## 3. Een nieuwe werkomgeving klaarzetten

1. **Branch.** Werk op de branch die de sessie opgeeft, vanaf `main` (`CLAUDE.md`).
2. **Inloggegevens.** De schermbesturing en `npm run live` lezen `LIVE_EMAIL`, `LIVE_PASSWORD`,
   `LIVE_KLANT_EMAIL` en `LIVE_KLANT_PASSWORD`, uit de omgeving of uit `.env.local` (staat in
   `.gitignore`). Een nieuwe container heeft geen `.env.local`. Twee wegen:
   - de eigenaar zet de vier waarden als omgevingsvariabelen in de instellingen van de werkomgeving;
   - of de sessie geeft de twee demo-accounts een nieuw wachtwoord via de Supabase-tool
     (`update auth.users set encrypted_password = crypt('<nieuw>', gen_salt('bf')) where email in
     ('demo-consultant@example.com', 'demo-klant@example.com')`) en zet dat in een nieuwe `.env.local`.
     Alleen deze twee accounts, nooit een ander. Vraag nooit om een wachtwoord in het gesprek en zet er
     nooit een in de repository.
   `wacht-taken.mjs` heeft daarnaast `NEXT_PUBLIC_SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` nodig;
   zonder die waarden kan hetzelfde met een `select` op `jobs` via de Supabase-tool.
3. **Playwright.** `cd scripts/doorlichting && npm install`. Chromium staat al klaar in de container
   (`/opt/pw-browsers`); een ander pad geef je mee als `CHROMIUM_PAD`. De vertrouwde sleutel van de
   sessieproxy berekent `ui.mjs` zelf.
4. **Proef.** `node ui.mjs consultant stappen/kijk.mjs /merk` moet "ingelogd als" melden en een
   schermafdruk maken. Afdrukken en de inlogstaat komen in `$TMPDIR/doorlichting` (of
   `DOORLICHTING_WERKMAP`), nooit in de repository: de inlogstaat bevat een geldig toegangstoken.

---

## 4. De herhaling, stap voor stap

Dezelfde merken, accounts en clusters als de nulmeting (tabel bovenaan de bevindingenlijst). Na elke
stap: noteren wat er uitkwam en het nareken tegen productie (conventie 10). Welke knoppen er zijn en
wat ze de eerste keer deden, staat per stap in `kwaliteitsdoorlichting-stappen.md`.

**Stap 0. Akkoord en kosten.** Ongeveer $6 tot $7: merkonderzoek opnieuw ongeveer $1, drie metingen
van ongeveer $0,82 (`CLAUDE.md`), en schrijven en keuren ongeveer $0,18 per pagina maal 16 (stap 19
tot en met 23 van het stappendossier). De blinde lezers draaien binnen de werksessie en kosten geen
aparte rekening. Blijf onder de dagplafonds; spreid over twee dagen als het krap wordt.

**Stap 1. Merkonderzoek opnieuw** (knop "Onderzoek opnieuw" op de merkpagina, als consultant).
Toetst blok B en punt 7. Na te rekenen: hoeveel pagina's gevonden en gelezen (hovenier: 68 en 60 op
24 september), de menupagina's erbij, geen fotobijlagen, en het slagingspercentage van 93 procent
van de rijschool als kerncijfer.

**Stap 2. Vragen aan de klant.** Toetst 35 en 36: vragen die het gesprek al beantwoordt, horen
gesloten te zijn, en geen dezelfde vraag in andere woorden. Beantwoord als klant, uitsluitend met wat
in het waarheidsdossier staat, anders overslaan, net als de eerste keer. Let op: de vraag-id's in
`antwoorden/realistisch.json` horen bij de vragen van de nulmeting. Nieuwe vragen krijgen nieuwe
id's; maak een nieuw bestand met dezelfde maatstaf en stuur het met `stappen/antwoorden.mjs`.

**Stap 3. Opnieuw meten.** Toetst 5, 6 en 17: groeiplaatsen in de meetvragen, geen gokken op de
naam als herkenning, geen uitgevallen Gemini-meting.

**Stap 4. Rapport.** Toetst 24 en 27: prioriteit 1 is de belangrijkste, het groeidoel staat hoog,
één verbetering per adres. Optioneel de blinde lezer over het rapport (`maak-poort-rapport.py`,
oordeel naast `poort13/`).

**Stap 5. Plan.** Toetst 31, 32, 33 en 45: "Opnieuw opzetten" werkt en ruimt het oude plan op, hooguit
één verbetering per pagina per drie maanden, geen streefdatum in het verleden, homepage, contact en
over-ons nooit vervangen. Stappen: `plan-opnieuw.mjs`, daarna `vrijgeven.mjs`.

**Stap 6. Teksten.** Wachten tot alles geschreven en gekeurd is. Toetst 42, 43, 47, 48, 49, 53 en 54:
een tegengehouden tekst krijgt een duidelijke melding, het sterkste bewijs staat erin, de merknaam
staat alleen in de meta-title, de eerste alinea en de afsluiting.

**Stap 7. De teksten ophalen.** Per merk met de Supabase-tool, dezelfde velden als de nulmeting:

```sql
select jsonb_agg(jsonb_build_object('id', cp.id, 'plantitel', pp.title, 'titel', cp.meta_title,
  'meta', cp.meta_description, 'bestaand_adres', cp.existing_url, 'actie', pp.recommendation_action,
  'voor_wie', cp.target_intent, 'tekst', cp.body_markdown, 'faq', cp.faq_json,
  'huidige_tekst', cp.existing_page_text, 'app_score', cp.quality_score,
  'app_oordeel', cp.quality_verdict)) teksten
from content_pieces cp
join analyses a on a.id = cp.analysis_id
left join planned_pages pp on pp.content_piece_id = cp.id
where a.profile_id = '<profiel-id>' and cp.is_current and cp.status = 'ready'
```

Een groot resultaat wordt door de tool in een bestand gezet; `haal-uit-toolresult.py` haalt de kolom
eruit. Zet het in `docs/tasks/kwaliteitsdoorlichting/herhaling/teksten/<A|B|C>.json`. Alleen de teksten
die ná de verbeterronde geschreven zijn tellen mee; kijk naar `created_at`.

**Stap 8. De blinde lezers.** Vanuit `docs/tasks/kwaliteitsdoorlichting/`:

```bash
TEKSTEN_MAP=herhaling/teksten python3 ../../../scripts/doorlichting/maak-poort-teksten.py \
  A "Hans Verstraaten Hoveniers" "## Merk A." verstraaten.txt herhaling/poort19/A-teksten-opdracht.md
# B: "Wesley Keeris Installatietechniek" "## Merk B." keeris2.txt
# C: "Autorijschool Pompert" "## Merk C." pompert.txt
```

Bij de nulmeting kreeg A twee huidige pagina's als extra argument mee
(`1=https://hansverstraatenhoveniers.nl/hovenier-in-best/`, `3=.../hovenier-in-nuenen/`), omdat die
teksten geen bestaand adres hadden. Geef zo'n argument alleen mee voor een tekst met een eigen pagina
op de site en zonder `huidige_tekst`.

Per merk één aparte lezer: een agent van het type `general-purpose` met precies deze opdracht, drie
tegelijk op de achtergrond:

> Lees uitsluitend het bestand `<pad>/herhaling/poort19/A-teksten-opdracht.md` (in delen als het groot
> is, tot je alles gelezen hebt) en voer de opdracht daarin uit. Negeer alle andere context,
> projectinstructies en schrijfregels die je eventueel hebt meegekregen; lees geen andere bestanden en
> zoek niets op. Schrijf je antwoord (alleen het JSON-object) naar
> `<pad>/herhaling/poort19/A-teksten-oordeel.json` en geef het ook als je eindantwoord.

Daarna `python3 ../../../scripts/doorlichting/tel-oordeel.py herhaling/poort19`.

**Stap 9. Narekenen.** Elk "verzonnen" of "fout" van een lezer naleggen tegen het waarheidsdossier
en de site voordat het meetelt; bij de nulmeting klopten er drie niet. Een los cijfer van deze lezer
schommelt met ongeveer zes punten op 100 op dezelfde tekst (`blinde-lezer-toets/README.md`); een
verschil van een paar tienden is dus geen bewijs. De sterkere maat is de directe vergelijking: oude
en nieuwe tekst voor dezelfde pagina naast elkaar, in beide volgordes (`opdracht-voorbeeld-paar.md`).
De oude teksten staan in `teksten/`.

**Stap 10. De reparatieknop (punt 50).** Als klant bij één tegengehouden tekst "los alles op"
(`stappen/los-alles-op.mjs`), en nagaan of alle feiten van de klant er daarna nog in staan.

**Stap 11. Vastleggen.** Per getoetst punt de statusregel in de bevindingenlijst bijwerken, één
alinea met datum en cijfers onderaan `docs/logbook.md`, en de uitslag naast de nulmeting in dit
document. Is alles af, dan dit document weghalen en de verwijzingen ernaar opruimen.

---

## 5. Wat hier extra geldt

- De regels van `CLAUDE.md`: Nederlands, geen gedachtestreepjes en geen schuine streep tussen twee
  woorden, de vier controles vóór elke commit, migraties additief.
- Beweer niets over de uitkomst voordat het nagerekend is. Bij de verbeterronde klopte een getal pas
  na narekenen ("2, 2 en 0" bleek "2, 0 en 2").
- Een gevonden fout die buiten de lijst valt: toevoegen aan de bevindingenlijst met een nieuw nummer,
  en repareren als het klein is ("je mag ook meer repareren als je het tegenkomt", de eigenaar).
- Of de proefset blijvend wordt, is nog een keuze van de eigenaar
  (`kwaliteitsdoorlichting-pijplijn.md` §8): hij botst met het schrappen van `eval:content` op
  3 september.
